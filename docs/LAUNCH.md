# Pichigoose: the road to launch

Everything we want in the app before it launches officially, in the order Nora chose (2 Nov 2026). Phones get the app from the App Store; desktop keeps the web app at pichigoose.com.

Each item says who it came from. ✅ means built, ⏳ means built but waiting for Nora, ⬜ means not started.

## The order

1. **Finish what's waiting.** Things already built that need Nora's yes.
2. **Gamification.** Trophies, recaps and the game slider.
3. **Pichi gets smarter.** Finding his talk again, then scanning receipts.
4. **Decide the rest of the plan.** Money, events, photos and the calendar: before launch or after.
5. **What Apple requires.** Account deletion, report and block, privacy pages, automated checks.
6. **Sign in with Apple, Google and Facebook.** Right before the move to native.
7. **The iPhone app.** The same app wrapped for iPhone, built on Nora's Mac.
8. **TestFlight for family and friends, then the public App Store.**
9. **Later:** Android, for Danko.

---

## 1. Built, waiting for Nora

- ✅ **A display name for each household** [Nora, 1 Nov]. In Settings, only for people in more than one household. Live 2 Nov.
- ⏳ **Settings that look like your profile** [Nora]. Big character, your name, a small pink "Change character", settings underneath. Say "push it live". Branch `settings-profile-look`.
- ✅ **Trophies, first version** [Danko and Nora]. Pichi guesses the chore from each to-do's name in English and Serbian, one trophy per chore each month, the rosette for three months in a row, a monthly recap, a trophy case on profiles. Live 2 Nov.
- ⬜ **Pichi is a he, and the Serbian copy** [Nora, 1 Nov]. Nora fixes the Serbian text across the app herself, including the About page.
- ✅ **Tidy-up:** the shopping items' old note column is gone from the database (2 Nov).

## 2. Gamification [Danko and Nora]

The full idea is in PRODUCT.md under "Trophies, recaps and rewards". The first version is built on the `trophies` branch.

- ✅ The first version is live (2 Nov).
- ⬜ **The game slider:** each household picks how much game it wants, from Off to God mode.
- ⬜ **Monthly recap** and **Year in the home**.
- ⬜ **Points and rewards for children**, with their own accounts.
- ⬜ **Streaks and the rivalry badge** (the higher levels).

Still to decide (Nora):
- The list of chore types. Claude's suggestion: dishes, laundry, hanging laundry, ironing, groceries, trash, cleaning, cooking, plants.
- Is the game off by default? Claude's suggestion: yes.
- Who sets the level? Claude's suggestion: everyone picks their own, and the household plays at the lowest.
- What points are for: glory only, or coupons like "breakfast in bed".
- The trophy names (Claude's placeholders are in PRODUCT.md).

## 3. Pichi gets smarter

- ✅ **Pichi keeps track** [Nora's mom, 31 Oct]. Everyday things go down on their own, he puts them on the list, and he learns from every correction. Live.
- ✅ **The Pichi talk** [Nora]. Short steps with a counter, room by room. Live.
- ⬜ **Find the Pichi talk again** [Nora, 1 Nov]. After "Not now" it's only behind Pichi's face in a pantry room and "Teach Pichi" on his page, and neither says what it does. Claude's suggestion: a small note in each room, "Teach Pichi what you use every day", until something there is tracked, and a label next to his face.
- ⬜ **Scan a receipt** [Danko, 2 Nov]. Scan the QR code on a Serbian fiscal receipt, and Pichi reads every item from the tax office's page.
  - Every scan helps right away: what you bought is ticked off the list and filled back up on the shelves.
  - Over several receipts he learns how often things are bought, so nobody waits for him to learn.
  - Cryptic store names ("PAVLAKA 20% 180G IMLEK"): Pichi asks once, "Is this your sour cream?", and remembers.
  - Prices stay out, because money is personal.
  - Works in the web app already; native makes the camera smoother.

## 4. Decide: before launch or after (Nora)

These are in the product plan but not built yet. Each one is either built before launch or kept hidden until after.

- ⬜ **Money, who owes who** (M1 to M8). Hidden in the app for now.
- ⬜ **Events** (E1 to E3). A simple temporary household for a picnic or a trip.
- ⬜ **Notifications** (X1, X2, P3). The real push comes with the iPhone app (section 7).
- ⬜ **Photos in chat** [Nora]. Needs a storage space and one new column on messages.
- ⬜ **Calendar.** Planning not started.

## 5. What Apple requires

- ⬜ **Delete your account inside the app.** Required for any app you can sign up for.
- ⬜ **Report and block** in the chat and comments. Required wherever people write to each other.
- ⬜ **A privacy policy and a support page** on pichigoose.com, linked from Settings and the App Store listing. Claude drafts, Nora edits.
- ⬜ **Nothing unfinished in sight.** Check every screen for placeholders.
- ⬜ **Automated checks** for what must never break: the offline shopping list, sending messages, Pichi keeping track.

## 6. Sign in with Apple, Google and Facebook [Nora, 1 Nov]

- ⬜ Added right before the move to native. Once Google or Facebook is there, Apple requires Sign in with Apple too, so all three go in together.

## 7. The iPhone app

The same app, wrapped for iPhone with Capacitor and built on Nora's Mac in Xcode. Nora is the first tester.

- ⬜ The wrap itself, with the app icon and launch screen.
- ⬜ **Real push notifications**, so nobody needs "Add to Home Screen" anymore.
- ⬜ **The keyboard under the app's control**, which fixes most of what the web keyboard fights.
- ⬜ **Haptics**, the real share sheet, and a smoother camera for receipts and photos.

## 8. TestFlight, then the App Store

- ⬜ Apple developer account ($99 a year).
- ⬜ TestFlight for family and friends first. Apple does a short check before outside testers can join.
- ⬜ A demo login with a demo household for Apple's reviewer: lists, chat and Pichi's things.
- ⬜ Screenshots, a description, an age rating, and the privacy questions (what the app stores: email, name, what people write).
- ⬜ Submit. If Apple says no, they say what to fix; we fix it and send it again.

## 9. Later

- ⬜ **Android**, for Danko, from the same app.
- ⬜ **The sticker sheets:** update the original sheets with the new hearts, so a re-cut keeps them.
- Desktop stays the web app.

---

## Questions only Nora can answer

1. Push live: the household display names, and the new Settings look?
2. Switch the old Serbian lines so Pichi is a he?
3. Money, events, photos in chat and the calendar: before launch or after?
4. The gamification decisions in section 2.
