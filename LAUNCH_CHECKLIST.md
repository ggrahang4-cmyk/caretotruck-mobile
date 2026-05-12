# caretotruck — Pre-Launch Checklist

Last updated: 2026-05-11

---

## 🔴 Blockers

- [x] **Password reset** — `app/(auth)/forgot-password/page.tsx` created, `lib/auth.ts` updated, "Forgot password?" link added to sign-in page
- [x] **IFTA detail page** — `app/(app)/ifta/[quarter]/page.tsx` created; shows state table, CSV export, "Mark as filed", formula explainer
- [x] **`/api/extract-document` unauthenticated** — auth gate added, all 5 onboarding scan handlers pass Bearer token
- [x] **`not-found.tsx` and `error.tsx` missing** — users see raw Next.js default pages on broken links / runtime errors
- [x] **Terms of Service page** — `app/terms/page.tsx` created; linked from sign-up and sign-in pages
- [x] **Privacy Policy page** — `app/privacy/page.tsx` created; linked from sign-up and sign-in pages

---

## 🟡 High Priority

- [x] **Mobile billing screen** — "Manage billing →" link in Settings opens https://www.caretotruck.com/billing
- [x] **Trial expiry on mobile** — amber/red banner shown when trial ≤ 3 days remaining; taps open billing
- [x] **Admin email env variable** — `NEXT_PUBLIC_ADMIN_EMAILS` documented in `.env.example`

---

## 🟢 Should Do Before Launch

- [ ] **Receipt list filtering** — no date range, category, or state filter; basic month/quarter picker covers 80% of the need
- [ ] **Trip list filtering** — same; date range at minimum
- [ ] **`loading.tsx` at `app/(app)/`** — all Firestore-heavy pages show blank flash; one spinner file covers all of them
- [ ] **End-to-end test: receipt → tax flow** — capture → OCR → category → tax estimate → quarterly payment cards
- [ ] **End-to-end test: IFTA flow** — log trip with state miles → add fuel receipt → generate pack → verify numbers

---

## ⚪ Post-Launch / Week 1

- [ ] Sentry (or similar) error tracking — you won't know when OCR fails in production without it
- [ ] Analytics (GA4 / Mixpanel) — measure signup funnel conversion
- [ ] Receipt CSV export for accountants
- [ ] Search / filter bar on receipts and trips lists
- [ ] Mobile billing deep link from Settings

---

## ✅ Already Solid

- Dashboard metrics, CPM math, 12-week trend chart
- Tax estimator (real 2025 IRS brackets, SE tax, QBI deduction)
- Full receipt OCR pipeline (upload → Gemini → Firestore)
- Onboarding 7-step wizard
- Trucks, drivers, fixed costs, settings — full CRUD
- Billing (Helcim, 3 tiers, trial countdown)
- Inspections 41-item DOT checklist (49 CFR § 396.13)
- `firestore.rules` and `storage.rules` exist
- All Gemini API routes properly authenticated
- `merchantState` null fix, `totalCents` manual_review routing, JSON parse safety in gemini.ts
