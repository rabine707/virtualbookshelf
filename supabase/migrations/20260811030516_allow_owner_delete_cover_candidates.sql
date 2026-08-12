create policy "cover_candidates_owner_delete"
on public.cover_candidates
for delete
to authenticated
using (uploaded_by = auth.uid());
