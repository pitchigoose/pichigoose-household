-- Tidy-up (Nora, 2 Nov): shopping items' old note column. Notes on items became comments (28 Oct), and
-- nothing reads or writes it anymore; no item had one left.
alter table public.list_items drop column if exists note;
