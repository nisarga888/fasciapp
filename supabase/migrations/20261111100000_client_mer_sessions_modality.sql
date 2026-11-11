-- Let one client mark the same belt complete in MER and in BBTRS.
-- Existing rows stay MER. Apply once on project smgccthvratixddwfhmu.

alter table public.client_mer_sessions
  add column if not exists modality text not null default 'mer';

alter table public.client_mer_sessions
  drop constraint if exists client_mer_sessions_owner_client_belt;

alter table public.client_mer_sessions
  drop constraint if exists client_mer_sessions_owner_client_belt_modality;

alter table public.client_mer_sessions
  add constraint client_mer_sessions_owner_client_belt_modality
  unique (practitioner_id, client_key, belt, modality);

alter table public.client_mer_sessions
  drop constraint if exists client_mer_sessions_modality_len;

alter table public.client_mer_sessions
  add constraint client_mer_sessions_modality_len
  check (modality in ('mer', 'bbtrs'));
