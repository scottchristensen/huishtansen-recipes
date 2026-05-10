# Huish Family Recipes — TODO

## Pending

- [ ] Fill in full recipe details from Google Docs — about 10 recipes have "See link" or "In Doc" for instructions/ingredients. Export the Google Docs (batch download from Drive as .docx), drop them in a folder, and run them through to update the seed data. Affected recipes:
  - Polenta Enchilada Bowls
  - Homemade Biscuits
  - Blueberry-Lemon Galette
  - Lemon Ricotta Pasta
  - Oatmeal Chocolate Molasses Cookies

## Roadmap

- [ ] **Restore Google SSO** — currently using a shared family PIN (`2468`). Switch to per-user Google sign-in via Supabase Auth so the `chef` field, notifications, and personalization are tied to a real identity. Most of the wiring already exists; restoration steps are in [_stash/sso/README.md](_stash/sso/README.md).

- [ ] **Email notifications & alerts** — opt-in per-user email preferences (configurable from `/settings`). Depends on SSO landing first so we have real user identities + emails. Likely use Supabase Edge Functions + Resend.
  - **New recipe added** — when anyone in the family adds a recipe, notify the others. Batch as a **daily digest**: one email per day summarizing how many recipes were added and by whom (with links). Never send a separate email per recipe.
  - Future ideas: weekly meal-plan reminder (Sunday), "you haven't tried this in a while" nudges, family-approved badge changes.
