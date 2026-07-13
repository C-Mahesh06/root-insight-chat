
create policy "Authenticated can read documents bucket" on storage.objects for select
  to authenticated using (bucket_id = 'documents');
create policy "Admins can upload documents" on storage.objects for insert
  to authenticated with check (bucket_id = 'documents' and public.has_role(auth.uid(), 'admin'));
create policy "Admins can update documents" on storage.objects for update
  to authenticated using (bucket_id = 'documents' and public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete documents" on storage.objects for delete
  to authenticated using (bucket_id = 'documents' and public.has_role(auth.uid(), 'admin'));
