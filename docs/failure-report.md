# Extraction Failure Report

**Total Processed:** 526,564
**Successfully Extracted:** 524,621 (99.6%)
**Failures (Skipped):** 1,943 (0.4%)

The Dead Letter Queue (`data/logs/onboarding_failures.json`) successfully captured all 1,943 failed rows. A deep dive into these failed records reveals that they fall into three distinct feedback categories for the upstream data extraction team.

### 1. Genuinely Colorless / Technical Descriptions (~500-600 items)
These are items (primarily innerwear) where the listing is purely technical. There is literally no color or pattern information in the text.

**Data Team Feedback:** The source data is missing color variants entirely. The vendor needs to supply the color name, otherwise Zalando will reject the onboarding.

**Examples:**
*   `[Clovia]` "cotton rich non padded front open plunge bra"
*   `[Sloggi]` "women go allround one size seamless vest tank top"
*   `[DAMENSCH]` "men deo soft deodorizing micro modal solid trunks dam as t obwgsb pack 3 mix"

---

### 2. Unmapped Marketing Colors (~800 items)
These are items where the brand is using hyper-specific or poetic names for colors that aren't in our standard dictionary.

**Data Team Feedback:** We need a brand-specific color dictionary mapping for these vendors to translate their marketing colors into Zalando's color taxonomy.

**Examples:**
*   `[HRX]` "men mosstone rapid dry colourblock tshirts" *(mosstone -> olive green)*
*   `[HRX]` "women marmalade typographic medium support sports bra" *(marmalade -> orange)*
*   `[bebe]` "sangria sunset party solid a line dress" *(sangria -> burgundy)*
*   `[HRX]` "women moonlit ocean solid regular fit rapid dry running shorts" *(moonlit ocean -> navy blue)*

---

### 3. Missed Multipack/Set Phrases (~500 items)
These are highly irregular phrasings of assortments that evade our current regex.

**Data Team Feedback:** We can implement minor regex tuning on our end, but if the data team could standardize "set of X" to "pack of X" at the source, it would guarantee 100% ingestion for these assortments.

**Examples:**
*   `[Mast & Harbour]` "men set of 3 ankle length socks" *(Brand name stripping left double-spaces, causing a mismatch in our regex)*
*   "pack 2 mix" *(Missing the word 'of')*
