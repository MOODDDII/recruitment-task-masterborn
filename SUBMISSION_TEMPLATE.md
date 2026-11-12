# Submission: Marian Bas

## Time Spent

Total time: **~3 hours**

## Ticket Triage

Order of priority: wrong prices and crashes first, then accessibility, then polish. Tickets that contradict each other or don't reproduce were not implemented blindly.

### Tickets I Addressed

1. **CFG-142**: Price stuck at $0.00. Fixed the stale-response guard in `usePriceCalculation`.
2. **CFG-148**: Crash when turning off "Include Packaging". Dependent add-ons are now removed for every option type.
3. **CFG-147**: Share link broke on some names. Now UTF-8 + base64url; old links still decode.
4. **CFG-152 (partial)**: Color swatches are keyboard accessible (one tab stop, arrow keys, focus style, accessible name).
5. **CFG-151**: Raw error codes replaced with clear messages and a next step.
6. **CFG-149**: Price is dimmed (not replaced) while recalculating, plus `aria-live`.
7. **CFG-143**: Resize listener is removed on unmount.
8. **CFG-156**: Stable keys. The reported warnings don't reproduce as described (keys existed, but were weak: index or display name).

### Tickets I Deprioritized

| Ticket  | Reason                                                                                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CFG-153 | Compare feature, 2-3 weeks. Out of scope.                                                                                                                    |
| CFG-155 | Dark mode, low priority, no business pressure.                                                                                                               |
| CFG-157 | Depends on `isDirty`, which is broken (true on mount, true again after loading a draft). Needs that rework first.                                            |
| CFG-158 | Suggested fix can't help: `currentConfig` is already memoized and `product` is a prop. Measure on a production build first (StrictMode doubles dev renders). |
| CFG-146 | Not confirmed by the code: both timestamps use local time. Needs a repro.                                                                                    |
| CFG-150 | Ticket blames JS, but `--color-columns` is never used in CSS. Needs a screenshot. (General 320px overflow was fixed separately, see Other Changes.)          |

### Tickets That Need Clarification

| Ticket  | Question                                                  |
| ------- | --------------------------------------------------------- |
| CFG-144 | Remove Quick Add? Contradicts CFG-145.                    |
| CFG-145 | Add a hotkey to Quick Add? Contradicts CFG-144.           |
| CFG-146 | Which OS, browser and timezone?                           |
| CFG-150 | Screenshot and viewport width of the broken layout.       |
| CFG-154 | Threshold (`>=` vs `>`) and rate (10% vs 15%). See below. |

### Tickets With a Misleading Priority Label

I agreed with the three 🔴 labels (142, 147, 148).

| Ticket  | Label on board | Your read        | Why                                                                                      |
| ------- | -------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| CFG-152 | ⚪ Low         | 🟠 High          | Description points to an accessibility compliance risk for the key customer, not polish. |
| CFG-158 | 🟠 High        | ⚪ Low           | No evidence of lag, and the suggested fix can't work.                                    |
| CFG-144 | 🟠 High        | 🧪 Unclear       | Contradicts CFG-145.                                                                     |
| CFG-145 | 🟠 High        | 🧪 Unclear       | Contradicts CFG-144.                                                                     |
| CFG-146 | 🟡 Medium      | Not reproducible | Code uses local time in both places.                                                     |
| CFG-156 | 🟡 Medium      | Not reproducible | Keys were present, only weak.                                                            |

### Tickets Where You Stopped to Ask Instead of Implementing

| Ticket        | Who would you ask     | What you'd ask                                                                                                                                                                                                                                                                          |
| ------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CFG-144 / 145 | PM + Customer Success | Product wants Quick Add removed, the customer reportedly needs its hotkey for a demo. Which wins? Building either could waste work or break the demo.                                                                                                                                   |
| CFG-154       | Finance / PM          | Code uses `>`: qty 10 gets 0% and qty 50 gets 5%. `CONTEXT.md` (10-49: 5%, 50+: 10%), a code comment and `getNextDiscountTier` all point to `>=`. But the ticket says marketing advertises 15%, not 10%. That is a pricing decision, and a wrong guess over- or undercharges customers. |

---

## Technical Write-Up

### Critical Issues Found

#### Issue 1: Price never updates

**Ticket(s):** CFG-142

**What was the bug?**

The hook ignored stale responses with `response.timestamp >= Date.now()`. The API's `timestamp` is a small request counter (1, 2, 3…), so the condition was never true and no price was ever applied. `isLoading` was also cleared after every request, including stale ones.

**How did you find it?**

Followed the symptom ($0.00) to the one place that applies the price and noticed it compares two different units.

**How did you fix it?**

Each effect run cancels its own response in cleanup, so an old response can't overwrite a newer one. `isLoading` is derived from whether the latest request has settled. Typing a draft name doesn't trigger a refetch. Removed the unused `useDebouncedPriceCalculation`.

**Why this approach?**

It doesn't depend on server ordering or clocks, and works the same with a real `fetch`.

---

#### Issue 2: Crash when turning off "Include Packaging"

**Ticket(s):** CFG-148

**What was the bug?**

Dependent add-ons were removed only for `select` options, not toggles. Gift Wrap stayed selected without packaging, and the summary crashed on `availableAddOns.get(id)!.price`. The same state also let the add-on into the price.

**How did you find it?**

Traced the crash site back to how an unavailable add-on could stay in `selectedAddOns`.

**How did you fix it?**

`handleOptionChange` now removes add-ons whose requirement is no longer met, for every option type, without mutating state. The summary also skips unavailable add-ons, because drafts and share links can load such a state.

**Why this approach?**

Fixing only the crash site would hide invalid add-ons still being priced; fixing only the handler would leave the crash reachable through drafts and links.

---

#### Issue 3: Share link crashes or loads the wrong configuration

**Ticket(s):** CFG-147

**What was the bug?**

Two causes. `btoa()` throws on non-Latin-1 text (e.g. "Żółć 🎨"), which white-screened the app. Standard base64 can contain `+`, which a query string reads as a space, so links decoded to garbage even for plain ASCII names.

**How did you find it?**

The ticket mentions special characters, but the `+` problem also breaks ASCII names, so I treated them as two separate causes.

**How did you fix it?**

UTF-8 + base64url encoding. The decoder also accepts links from the old encoder. The configuration name is restored from the link.

**Why this approach?**

Old links may already exist, and the `?config=` format stays the same.

---

### Other Changes Made

- Made `ProductConfigurator.tsx` pass `eslint` so the pre-commit hook works (including the `exhaustive-deps` warning, fixed with `useEffectEvent` so behavior doesn't change).
- The "Draft saved" panel now disappears when that draft is deleted.
- Moved styles from `App.tsx` to `styles.css`.
- Fixed the header and buttons at 320px width, and removed paddings that broke the layout and pushed elements outside the viewport.
- Checked manually: console is clean and all flows were clicked through.

---

## Code Quality Notes

### Things I Noticed But Didn't Fix

| Issue                                                                                                                                   | Why I Left It                                          |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Quick Add doesn't check `isPriceLoading`, so it can add a stale price                                                                   | Depends on the CFG-144/145 decision.                   |
| `isDirty` is true on mount and after loading a draft; Discard resets without confirmation                                               | Part of CFG-157.                                       |
| `roundToCents` is unused, so line items can differ from the total by a cent                                                             | Needs a decision on where rounding happens.            |
| Warning at quantity > 47 hits exactly the high-volume customers                                                                         | Needs product confirmation.                            |
| Share link values aren't validated against the product                                                                                  | Low impact, own ticket.                                |
| Premium Engraving works only with Aluminum (Magnesium is also metal); hint shows "Requires material"                                    | Product decision; small copy fix.                      |
| Rest of CFG-152: toggle has no accessible name, quantity buttons have no focus style, modals lack dialog semantics and focus management | I scoped it to the swatches; this should be done next. |
| `ERR_NETWORK_TIMEOUT_PRICE` is defined but never set                                                                                    | Nothing triggers it.                                   |

### Potential Improvements for the Future

1. Add tests (Vitest + Testing Library).
2. Rework `isDirty` together with CFG-157.
3. Make pricing and discount tiers a single source of truth, so the UI hint and the discount can't disagree.
4. Split the large component and make modals proper dialogs.

---

## Questions for the Team

1. CFG-144/145: which wins for the demo, removing Quick Add or its hotkey?
2. CFG-154: `>=` or `>`, and is the 50+ discount 10% or 15%?
3. Should Premium Engraving also work with Magnesium Alloy?
4. Is the warning at quantity > 47 intentional?
5. CFG-146 / CFG-150: OS, browser, timezone, and a screenshot.

---

## Assumptions Made

1. Node 22.13+ is required (per `package.json`), even though the email says 18+.
2. The mocked API reflects the real backend.
3. Where a ticket and `CONTEXT.md` disagree, `CONTEXT.md` is the source of truth, but I didn't change pricing without confirmation.
4. Old share links should keep working.

---

## Self-Assessment

### What went well?

Triaged before coding. Contradictory tickets (144/145, 154) were escalated instead of guessed, and each fix is a separate commit. Everything was checked manually and the console is clean.

### What was challenging?

Tickets contradict each other, some hints in them are wrong, and the pre-commit hook failed on lint errors that were already in the file.

### What would you do differently with more time?

Finish CFG-152 (modals, quantity buttons), add tests, rework `isDirty` with CFG-157, and get answers to the open questions.

---

## Additional Notes

The PR template is slightly out of date: it has no CFG-158, and it describes CFG-142 differently from the ticket.
