# Meal planning

A plain-files home for weekly dinner planning, worked through chat with Claude. The recipe app in `src/` is untouched; nothing here changes it.

## What's here

- `recipes/` One file per recipe, with time, servings and tags. `recipes/README.md` is the index.
- `pantry.md` What's already in the fridge, freezer and pantry, so we don't buy duplicates.
- `meal-plans/` One file per week, named for the Monday it starts (`2026-11-30.md`). Each has the dinners and one combined grocery list.

## The Sunday flow

1. Sunday afternoon, Claude nudges you and shows the week's busy evenings from the calendar.
2. You say what's in the kitchen. Claude updates `pantry.md`.
3. Claude suggests dinners for 4: variety across proteins and styles, quick or slow-cooker meals on busy nights, longer cooks on open nights, and recipes that share ingredients.
4. You swap anything you don't want. Claude writes the week file.
5. Claude builds one grocery list by store aisle, minus what's in the pantry, with shared ingredients combined.
6. Once you're happy, Claude puts each dinner on the calendar, 5 to 6 PM, named for the meal.
7. Ordering is a later step and always waits for your yes at checkout.

## Adding a recipe

Send Claude a link, a photo (a cookbook page, a snack package, a plate) or just describe it. Claude asks what it needs to suggest it well later: who loves it, how the kids feel about it, hands-on and total time, whether it's good as leftovers, which meals and seasons it fits. Then it saves a new file in `recipes/` from `recipes/_template.md`.

## Planning rules

- Plan for 4: two adults, Otto and Cora.
- Dinners are the anchor, but breakfasts, lunches and snacks can be planned too.
- We love next-day leftovers for lunch, so cook dinners big enough for two adult lunches unless a recipe says it doesn't keep.
- Busy night (activity between 4 and 7 PM): 30 minutes or less, slow cooker, or leftovers.
- No-cook nights (party, dinner out): marked as such, nothing bought.
- Prefer one big batch that covers a second night.
- After a dinner is made, set `last_made` on the recipe so the same meals don't repeat too often.
