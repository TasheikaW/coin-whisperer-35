

# Rename App: BudgetFlow → Fundza

A straightforward find-and-replace across all files where "BudgetFlow" appears, plus updating the HTML title and meta tags.

## Changes

| File | What changes |
|------|-------------|
| `index.html` | Update `<title>` and `og:title` from "Lovable App" to "Fundza" |
| `src/pages/Index.tsx` | Replace "BudgetFlow" (3 occurrences: hero logo, footer name, copyright) |
| `src/pages/Auth.tsx` | Replace "BudgetFlow" (2 occurrences: welcome toast, card title) |
| `src/components/layout/AppSidebar.tsx` | Replace "BudgetFlow" in sidebar brand name |
| `src/index.css` | Update the CSS comment from "BudgetFlow" to "Fundza" |

Total: 7 text replacements + 2 HTML meta updates. No logic changes.

