-- Pichi keeps track (Nora and her mom, 31 Oct). Updating the pantry every day takes too long. For the things you
-- use every day (coffee, toothpaste, sour cream), you tell Pichi once how often you buy them and how many, like
-- "every 2 weeks, 4 packs", and he lowers them himself, a little at a time. When the last one runs low, he puts
-- it on the shopping list. When someone corrects a level, the app learns from it (see actions.ts).
--
--   lasts_days     how many days one of them lasts (one row is one pack). Empty: people update it themselves.
--   buy_count      how many you buy at once. Buying it on the list puts this many back on the shelf.
--   drained_at     up to when Pichi has counted. He only takes whole percents, and moves this on by exactly
--                  the time they stand for, so nothing is lost between his rounds.
--   pichi_drained  how much he has taken since a person last said how full it is. The app compares the two
--                  to learn how fast it really goes.
-- Like low_at and list_id, all four are shared by every row of a group (the four sour creams).

alter table public.pantry_items
  add column lasts_days real check (lasts_days is null or lasts_days between 0.1 and 3650),
  add column buy_count smallint not null default 1 check (buy_count between 1 and 50),
  add column drained_at timestamptz,
  add column pichi_drained int not null default 0 check (pichi_drained >= 0);

-- Pichi's round, every hour. For each group he keeps track of: take what has been used since his last round,
-- from the emptiest one first. An empty one is tossed while others are left; the last one stays at 0, like
-- when a person empties it. If the group just got down to its last one and that one is almost out, it goes on
-- the shopping list (the group's list, else the household's first shopping list), unless it's already there.
create function public.pichi_tick() returns void
language plpgsql security definer set search_path = '' as $$
declare
  g record;
  r record;
  pct int;
  remaining int;
  take int;
  rows_left int;
  was_low boolean;
  last public.pantry_items;
  target uuid;
begin
  for g in
    select household_id, spot_id, lower(trim(name)) as k,
           min(drained_at) as drained_at, max(lasts_days) as lasts_days,
           max(buy_count) as buy_count, max(pichi_drained) as pichi_drained
      from public.pantry_items
     where lasts_days is not null and spot_id is not null
     group by household_id, spot_id, lower(trim(name))
  loop
    -- Just switched on: start counting from now.
    if g.drained_at is null then
      update public.pantry_items set drained_at = now()
       where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k;
      continue;
    end if;

    pct := floor(extract(epoch from (now() - g.drained_at)) / 86400.0 * 100 / g.lasts_days);
    if pct < 1 then
      continue;
    end if;

    select count(*) = 1 and bool_and(level <= low_at) into was_low
      from public.pantry_items
     where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k;

    remaining := pct;
    for r in
      select * from public.pantry_items
       where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k
       order by level, created_at desc
    loop
      exit when remaining <= 0;
      select count(*) into rows_left from public.pantry_items
       where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k;
      take := least(remaining, r.level);
      remaining := remaining - take;
      if r.level - take = 0 and rows_left > 1 then
        delete from public.pantry_items where id = r.id;
      elsif take > 0 then
        update public.pantry_items set level = level - take, updated_at = now() where id = r.id;
      end if;
    end loop;

    -- Everything used up: there's nothing left to count, so start again from now.
    update public.pantry_items
       set drained_at = case when remaining > 0 then now()
                             else g.drained_at + make_interval(secs => pct * g.lasts_days * 864) end,
           pichi_drained = g.pichi_drained + (pct - remaining)
     where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k;

    -- Down to the last one, and it's almost out?
    if was_low then
      continue;
    end if;
    select count(*) into rows_left from public.pantry_items
     where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k;
    if rows_left <> 1 then
      continue;
    end if;
    select * into last from public.pantry_items
     where household_id = g.household_id and spot_id = g.spot_id and lower(trim(name)) = g.k;
    if last.level > last.low_at then
      continue;
    end if;
    if exists (select 1 from public.list_items where pantry_item_id = last.id and checked_at is null) then
      continue;
    end if;
    select l.id into target from public.lists l
     where l.household_id = g.household_id and l.project_id is null
     order by (l.id = last.list_id) desc, l.position, l.created_at
     limit 1;
    if target is null then
      continue;
    end if;
    insert into public.list_items (list_id, name, added_by, position, pantry_item_id, added_by_pichi)
    values (target,
            trim(last.name) || case when g.buy_count > 1 then ' × ' || g.buy_count else '' end,
            null, 0, last.id, true);
  end loop;
end;
$$;
revoke execute on function public.pichi_tick() from public, anon, authenticated;

-- Every hour, at 17 past (not on the hour, when everyone else's jobs run).
create extension if not exists pg_cron;
select cron.schedule('pichi-tick', '17 * * * *', 'select public.pichi_tick()');
