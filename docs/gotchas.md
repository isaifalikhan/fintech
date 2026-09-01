# Gotchas

Every entry here cost real debugging time in this repo. Skim before hunting a bug.

---

## supabase-js query builders are lazy thenables

```ts
// ❌ silently never sends the request
void sb.from('organizations').update({ name }).eq('id', id);

// ✅
sb.from('organizations').update({ name }).eq('id', id)
  .then(({ error }) => { if (error) logUnexpectedError('...', error); });
```

A bare `void builder` constructs the chain and discards it. No network call, no error — the write
just doesn't happen. Cost hours of chasing RLS/caching red herrings.

---

## React renders `0` as visible text

```tsx
{txn.confidence && <span>{txn.confidence}%</span>}   // ❌ prints "0"
{!!txn.confidence && <span>…</span>}                  // ✅
{item.value != null && <span>…</span>}                // ✅ when 0 is meaningful
```

React skips `false`/`null`/`undefined` but **renders `0`**. Fixed in 10 places (confidence, interest
rate, installment amount, chart tooltips/legends). Also applies to `arr.length &&`.

---

## `pdfjs-dist` breaks the Vite dep optimizer

Symptom: the entire app dies with `Failed to fetch dynamically imported module: …/OrganizationWorkspace.tsx`,
and the network tab shows a `chunk-XXXX.js` 404 right after `pdfjs-dist.js` 200s.

Fixed by `optimizeDeps: { exclude: ['pdfjs-dist'] }` in `vite.config.ts`. If it recurs:

```bash
rm -rf node_modules/.vite
```

Then restart. This is **not** a browser cache issue — don't waste time on hard reloads.

---

## Stacking contexts: app header vs. in-page header

App headers (org/employee/platform) are `relative z-[60]`. Each page's `PageHeader` is
`sticky top-0 z-50`. They are siblings in the same stacking context, so a header at `z-30` (the old
value) put the org-switcher dropdown **behind** the page.

Diagnose with a hit-test, not by eye:

```js
const r = menu.getBoundingClientRect();
const top = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
menu.contains(top) || menu === top;   // false ⇒ something paints over it
```

---

## `scrollIntoView()` scrolls every ancestor

It walks all scrollable ancestors, so calling it inside a chat log also yanks the page. When the pane
is its own scroll container, drive it directly:

```ts
logRef.current.scrollTop = logRef.current.scrollHeight;
inputRef.current?.focus({ preventScroll: true });
```

---

## `AuthContext` is Fast-Refresh incompatible

Vite logs `Could not Fast Refresh ("useAuth" export is incompatible)`. After editing it you'll see
`useAuth must be used within an AuthProvider` from **stale module instances** (mismatched `?t=`
timestamps in the stack trace). Hard-reload before believing it.

More generally: the console buffer keeps errors from mid-edit HMR states. Verify against a fresh load
and the rendered DOM.

---

## Auth is `null` during session restore

`user` is briefly `null` while `AuthContext` restores a session. Branching on `user` alone treats a
logged-in user as anonymous:

```ts
if (!isLoading && user) { /* safe: confirmed logged in */ }
```

---

## `Math.max()` / `Math.min()` on empty arrays

`Math.max(...[])` is `-Infinity`, which turns every derived width/percentage into `NaN`. Guard:

```ts
const max = items.length > 0 ? Math.max(...items.map(i => i.value)) : 0;
```

---

## A trend line needs ≥ 2 points

Recharts draws isolated dots and no line for a single datum — users read that as "broken" or "not
updating". If the selected range yields < 2 points, render an explicit
"only N months of history / pick a longer range" state instead of an empty-looking chart.

---

## `/NaN/i` matches "Finance"

`"Finance"` contains **nan**. A QA sweep using `/NaN/i` flagged every page in the app. Use `\bNaN\b`.

---

## Preview-pane screenshot scaling

At the `mobile`/`tablet` presets the in-app browser returns tiny or garbled screenshots
(devicePixelRatio artifact). The DOM is fine. Verify responsive work with measurements
(`getBoundingClientRect`, `window.innerWidth`, computed styles) rather than screenshots.

---

## `npm` is not installed

Only `pnpm` (`C:\Users\Fame\AppData\Local\pnpm`). `npm run …` fails with
`The term 'npm' is not recognized`. Vite also shifts to **5174+** when 5173 is occupied — check which
port the terminal actually printed before concluding a change "didn't apply".

---

## Same-label buttons

"Transactions" exists both as a sidebar nav item and as an inner tab on Inventory. Scope DOM queries
to the container, or you'll click the wrong one.

---

## The page's search box is the first `<input>`

When scripting form fills, `document.querySelectorAll('input')[0]` is often a page-level search field,
shifting every subsequent index by one. Scope to the dialog.
