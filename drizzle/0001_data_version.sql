-- Every write to a clinic table bumps data_version's one row (src/db/version.ts), so pages re-render only after a
-- real write. A table added later gets its trigger in its own migration: select watch_writes('new_table');
insert into data_version (id) values (1);
--> statement-breakpoint
create function bump_data_version() returns trigger language plpgsql as $$
begin
  update data_version set version = version + 1, written_at = now() where id = 1;
  return null;
end $$;
--> statement-breakpoint
create function watch_writes(t regclass) returns void language plpgsql as $$
begin
  execute format('create trigger %I after insert or update or delete or truncate on %s for each statement execute function bump_data_version()', 'bump_' || t::text, t);
end $$;
--> statement-breakpoint
select watch_writes(c.oid) from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'data_version';
