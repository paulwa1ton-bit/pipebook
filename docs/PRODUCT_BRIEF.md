# PipeBook - Product Brief

## Who it's for
Solo UK plumbers (and one-van heating engineers) who do their paperwork in the
van or on a Sunday night, and who don't want an office-grade job management system
priced per user.

## The problem
- Quotes, invoices and receipts get done late, from memory, or not at all.
- Repeat work (annual boiler services, landlord CP12s, unvented cylinder
  services) is lost because nobody chases it.
- **Making Tax Digital for Income Tax** means quarterly digital updates to HMRC:
  over £50k income from April 2026, **over £30k from April 2027**, over £20k from
  April 2028. Most sole traders still keep records in a notebook, a spreadsheet,
  or with their accountant.

## The promise
"Say the job, send the invoice, and your tax records keep themselves up to date."

## MVP (this first build)
| Area | What's in it |
|---|---|
| Quick job entry | One line, typed or dictated with the keyboard mic: "Mrs Smith, replaced kitchen tap, 1 hour, £85 parts" turns into a costed job |
| Jobs | Status flow: quote, booked, done, invoiced, paid. Edit charges, customer phone and address |
| Invoices | Sequential numbers (INV-0001), payment terms and bank details, shared as text via SMS, WhatsApp or email |
| Reminders | Annual work detected automatically, with a reminder 12 months later and a one-tap "text to book in" |
| Money & tax | Current MTD quarter, deadline countdown, cash-basis income, expenses in HMRC categories |
| Offline | Everything is stored on the phone and works with no signal |

## Roadmap
1. **Validate**: 5-10 plumber interviews (script below), then put the MVP on their phones through Expo Go.
2. **Paperwork polish**: ~~PDF invoices and quotes with a logo~~ (done), photo receipts for expenses, mileage logging.
3. ~~**Accounts and backup**: Firebase sign-in and cloud backup, so data survives a lost phone.~~ (done; needs a Firebase project, see README)
4. **Getting paid**: card or Open Banking payment links on invoices, automatic chasing of overdue invoices, deposits.
5. **MTD submission**: register as HMRC-recognised software (developer hub, sandbox testing and production approval), then submit quarterly updates and the final declaration from the app. This is the subscription driver.
6. **Certificates**: Gas Safe and CP12 records, Benchmark, unvented (G3), building regs notifications.
7. **AI quoting**: photos and voice turned into an itemised quote, priced from merchant parts lists.

## Pricing hypothesis (to test in interviews)
- Free: jobs and invoices, up to about 10 a month.
- Around £12-15 a month: unlimited jobs, reminders, MTD records and submission.
- Undercut per-user job-management tools, which tend to start around £30+ a month.

## Customer interview script (20 min)
1. Walk me through last week's paperwork. When, where, and how long did it take?
2. How do you quote and invoice today? What do you use?
3. How do you know when a customer's boiler service is due? How many of those do you lose?
4. Who does your tax? Have you heard about Making Tax Digital? What's your plan for it?
5. What have you tried and given up on (Tradify, Jobber, spreadsheets...)? Why?
6. What do you pay today for software, accountant and lead sites?
7. If one app did your invoices, chased services and sorted MTD, what would it be worth a month?
8. Can I put an early version on your phone and check back in two weeks?

## Open questions
- Is VAT support needed early? (Most sole traders are under the £90k VAT threshold.)
- Is it worth partnering with an accountant or bookkeeper for referrals?
- Which merchants (City Plumbing, Plumb Center, Screwfix, Toolstation, BES) offer usable price feeds?
