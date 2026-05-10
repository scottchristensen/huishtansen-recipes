# SSO stash

Google SSO via Supabase Auth was wired up here but pulled out for time. To restore:

1. Restore files:
   - `_stash/sso/auth-context.tsx` → `src/lib/auth-context.tsx`
   - `_stash/sso/supabase-server.ts` → `src/lib/supabase-server.ts`
   - `_stash/sso/AuthGate.tsx` → `src/components/AuthGate.tsx`
   - `_stash/sso/auth-route/callback/route.ts` → `src/app/auth/callback/route.ts`
2. Run `supabase-migration-auth.sql` in Supabase SQL Editor (creates `profiles` table + tightens RLS).
3. In Supabase Dashboard:
   - Authentication → Providers → Google: enable + add Client ID/Secret
   - Authentication → URL Configuration: add prod + localhost URLs to allowlist
4. In Google Cloud Console: add Supabase callback URL to Authorized redirect URIs and your app domain to Authorized JavaScript origins.
5. Delete the PIN-based pieces:
   - The `huish-pin-auth` localStorage key
   - The `FAMILY_CODE` constant + `isAuthenticated`/`authenticate`/`logout` in `src/lib/recipes-store.ts`

The PIN gate is a placeholder for family-only soft auth; SSO gives us per-user identity for the chef field auto-fill, weekly emails, and personalization.
