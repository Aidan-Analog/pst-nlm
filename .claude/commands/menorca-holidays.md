---
description: Find low-cost family holidays to Menorca (June–mid-August), prioritising Irish airports and Cala'n Bosch accommodation
---

Search for the cheapest available flights and package holidays to Menorca (MAH airport, Spain) for the period **June 1 to August 15** of the current or next upcoming year.

## Party
**Family of 5:**
- 2 adults
- 1 teenager aged 13 (priced as adult on most airlines)
- 2 children under 12 (eligible for child discounts on package holidays)

When quoting prices, show both **price per adult** and **total family cost**. Note that the 13-year-old is typically charged at the adult rate for flights; package holiday operators (Sunway, TUI, Jet2) may offer child discounts for the two under-12s.

## Arguments
The user may have passed arguments: $ARGUMENTS

Parse the following from $ARGUMENTS (all optional):
- `from XXX` — origin airport IATA code (e.g. `from DUB`)
- `budget NNN` — max **total family budget** in EUR or GBP (e.g. `budget 3000`)
- `NNN nights` — trip duration, either 7 or 14 (e.g. `7 nights`)
- If no arguments provided, use the defaults below.

**Defaults:**
- Origins: Dublin (DUB), Shannon (SNN), Cork (ORK), Belfast (BFS and BHD)
- Budget: €3,000 total for the family (≈€600/adult equivalent)
- Duration: 7 nights
- Preferred accommodation area: Cala'n Bosch, Menorca

## Search Steps

Perform the following web searches in order:

1. Search: `family package holiday Menorca Calan Bosch 2026 Ireland 2 adults 3 children Sunway TUI`
2. Search: `cheap family flights Menorca MAH June July August 2026 Dublin 5 passengers Ryanair Aer Lingus`
3. Search: `cheap flights Menorca 2026 Shannon Cork Belfast family 5 summer deals`
4. Search: `family holidays Menorca 2026 Ireland cheap self catering apartment Calan Bosch`
5. Search: `Menorca family holiday deals June July August 2026 Ireland all inclusive half board`
6. If no Irish deals found or UK origin specified: `family flights Menorca summer 2026 [origin] 5 passengers easyJet Jet2holidays`

## Filtering Rules

- Include **only** departures between June 1 and August 15 (return date may extend beyond Aug 15)
- Exclude deals above the total family budget
- For package holidays, **prioritise** those with accommodation in or near: Cala'n Bosch, Son Xoriguer, or Cala Galdana (all southwest Menorca)
- Prefer **family-friendly** accommodation (apartments, villas, or hotels with kids' facilities)
- Note any child discount applied for under-12s

## Output Format

Present results as a ranked markdown table sorted by **total family cost** (cheapest first):

| # | Departs | Returns | Nights | From | Price/adult | Child price | **Total (family of 5)** | Hotel / Area | Board | Provider | Link |
|---|---------|---------|--------|------|-------------|-------------|------------------------|--------------|-------|----------|------|

After the table:
- Highlight the single **best value deal** with a note on why it stands out
- Flag any deal under **€2,500 total** for the family as exceptional value
- Call out any child-free places or adults-only properties to avoid
- Note: *Prices last searched: [current date and time]*

If no deals are found within the budget, show the 5 cheapest found regardless of budget and note the budget was exceeded.

If web search returns no relevant results, explain what was searched and suggest the user check Sunway.ie, Ryanair.com, Aerlingus.com, Jet2holidays.com, and Skyscanner.ie directly — searching for Menorca (MAH), 5 passengers (2 adults + 3 children).
