# RB Moving — Supabase activation

1. Create a dedicated Supabase project for RB Moving.
2. Open SQL Editor and run `schema.sql` once.
3. In Authentication > Users, create the RB Moving administrator user (email + password).
4. Copy that user's UUID and run:

```sql
insert into public.admin_users(user_id, display_name)
values ('PASTE_AUTH_USER_UUID', 'RB Moving Admin')
on conflict (user_id) do nothing;
```

5. In Project Settings/API copy:
   - Project URL
   - public/anon key
6. Paste only those two public values into `/supabase-config.js`.
   Never put a `service_role` key in website code.
7. Deploy to Netlify/GitHub.
8. In Netlify > Forms > Form notifications, configure an email notification for the form `rb-booking` to the owner's desired email address.
9. Test from two different devices: reserve a slot on Device A; Device B must show it as `Booked` and disabled.
10. Add authentic Google reviews from Administration. The database supports `google_review_id`, source URL, visibility and sort order for a later API sync.

Stripe is intentionally not activated in this build.
