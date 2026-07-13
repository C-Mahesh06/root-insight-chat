
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.match_document_chunks(vector, int) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
