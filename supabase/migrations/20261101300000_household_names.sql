-- A different name in each household (Nora, 1 Nov): "Lada" with her dad, "Nora" with her uncle. Empty: the name
-- from your profile. Only people in that household see it. You change only your own (the existing policy
-- "change only your own row" covers it).
alter table public.household_members
  add column display_name text check (display_name is null or length(trim(display_name)) between 1 and 40);
