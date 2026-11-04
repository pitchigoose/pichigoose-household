# Pichigoose: the road to launch

Everything we want in the app before it launches officially, in the order Nora chose (2 Nov 2026). Phones get the app from the App Store; desktop keeps the web app at pichigoose.com.

Each item says who it came from. ✅ means built, ⏳ means built but waiting for Nora, ⬜ means not started.

## The order

1. **Finish what's waiting.** Things already built that need Nora's yes.
2. **Gamification.** Trophies, recaps and the game slider.
3. **Pichi gets smarter.** Finding his talk again, then scanning receipts.
4. **The rest of the plan.** A calmer menu first, then money, photos in chat, the calendar, events, and the app for people living alone. All before launch.
5. **What Apple requires.** Account deletion, report and block, privacy pages, automated checks.
6. **Sign in with Apple, Google and Facebook.** Right before the move to native.
7. **The iPhone app.** The same app wrapped for iPhone, built on Nora's Mac.
8. **TestFlight for family and friends, then the public App Store.**
9. **Later:** Android, for Danko.

---

## 1. Built, waiting for Nora

- ✅ **A display name for each household** [Nora, 1 Nov]. In Settings, only for people in more than one household. Live 2 Nov.
- ✅ **Settings that look like your profile** [Nora]. Big character, your name, a small pink "Change character", settings underneath. Live 2 Nov.
- ✅ **Trophies, first version** [Danko and Nora]. Pichi guesses the chore from each to-do's name in English and Serbian, one trophy per chore each month, the rosette for three months in a row, a monthly recap, a trophy case on profiles. Live 2 Nov.
- ⬜ **Pichi is a he, and the Serbian copy** [Nora, 1 Nov]. Nora fixes the Serbian text across the app herself, including the About page.
- ✅ **Tidy-up:** the shopping items' old note column is gone from the database (2 Nov).

## 2. Gamification [Danko and Nora]

The full idea is in PRODUCT.md under "Trophies, recaps and rewards".

- ✅ The first version is live (2 Nov).
- ✅ Tap a trophy for the details, the tug of war, and Share with its own picture (2 Nov).
- ⬜ **The trophy share picture** [Nora, 2 Nov]: make the gold medal behind the trophy bigger, so it doesn't look so small next to it.
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

## 4. The rest of the plan, all before launch [Nora, 2 Nov]

Each one gets planned with Nora first, then built.

- ⬜ **A calmer menu, first** [Nora, 2 Nov]. The menu is getting cluttered, and money, the calendar and events would each want a place in it. Rethink where everything lives before adding more, so it never feels like too much at once.
- ⬜ **Money, who owes who** (M1 to M8). Hidden in the app for now. Waits for the menu rethink; then the open question in PRODUCT.md: what money looks like in version 2.
  - **The look** [Nora, 4 Nov]: a ring like Flo's sleep score, colored in by where the money goes (food, home, fun), on its own panel on Home under the shelves. Only your own money, and gone completely when money is off.
- ⬜ **Calendar on Home** [Nora, 4 Nov]: a panel under the shelves, like the money ring.
- ⬜ **Events** (E1 to E3). A simple temporary household for a picnic or a trip. To discuss later [Nora, 2 Nov]. Open question in PRODUCT.md: how simple is "simpler than a household"?
- ⬜ **Photos in chat** [Nora]. Needs a private storage space and one new column on messages (a table change, so Nora's OK first).
- ⬜ **Calendar.** Planning not started: what goes on it (to-dos with dates, events, chores) and where it lives.
- ⬜ **Notifications** (X1, X2, P3). The real push comes with the iPhone app (section 7).
- ⬜ **For people living alone** [Nora, 2 Nov]. When setting up, Pichi asks: "Are you living alone or with someone?" Living alone gets its own, simpler version of the app:
  - **Keeps:** to buy, projects, budgeting, and to-dos if they want them. Everything that makes sense for one person.
  - **Leaves out:** the chat, members, inviting, read ticks, and anything else that's about other people.
  - **Nora tests it** by creating a new household while she's alone.
  - **The big question to answer first:** why would someone living alone switch from pen and paper? (Claude's first thoughts below.)

  Claude's first thoughts on "why not pen and paper" (to discuss, not decided):
  - **Pichi does what paper can't:** he notices when coffee or toothpaste is running low and puts it on the list himself, and later reads receipts.
  - **The list is always with you:** in the store, offline, even when the paper list is on the fridge at home.
  - **Things come back on their own:** repeating to-dos and reminders.
  - **Money in one place:** budgeting, and who owes you, without a spreadsheet.
  - **It's still a notebook:** the scrapbook look keeps the joy of pen and paper, so switching doesn't feel like giving it up.
  - **Moving in with someone later is one tap:** invite them, and the same app grows into the shared version.

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

- ✅ The wrap itself, with the app icon and launch screen (2 Nov). How to install it: `docs/NATIVE.md`.
- ⬜ **Real push notifications**, so nobody needs "Add to Home Screen" anymore.
- ✅ **The keyboard under the app's control**: the app gets the keyboard's real height before it moves (2 Nov). To check on Nora's iPhone.
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

1. The gamification decisions in section 2.
2. For money, events, photos and the calendar: the questions in section 4, when we plan each one.
