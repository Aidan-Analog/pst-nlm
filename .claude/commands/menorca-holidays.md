---
description: Find low-cost holidays to Menorca (June–mid-August), prioritising Irish airports and Cala'n Bosch accommodation
---

Search for the cheapest available flights and package holidays to Menorca (MAH airport, Spain) for the period **June 1 to August 15** of the current or next upcoming year.

## Arguments
The user may have passed arguments: $ARGUMENTS

Parse the following from $ARGUMENTS (all optional):
- `from XXX` — origin airport IATA code (e.g. `from DUB`)
- `budget NNN` — max price per person in EUR or GBP (e.g. `budget 450`)
- `NNN nights` — trip duration, either 7 or 14 (e.g. `7 nights`)
- If no arguments provided, use the defaults below.

**Defaults:**
- Origins: Dublin (DUB), Shannon (SNN), Cork (ORK), Belfast (BFS and BHD)
- Budget: €500 per person
- Duration: 7 nights
- Preferred accommodation area: Cala'n Bosch, Menorca

## Search Steps

Perform the following web searches in order:

1. Search: `cheap flights Menorca MAH June July August 2026 from Dublin Ryanair Aer Lingus`
2. Search: `cheap flights Menorca 2026 Shannon Cork Belfast summer deals`
3. Search: `package holidays Menorca Calan Bosch 2026 Ireland Sunway TUI Jet2`
4. Search: `Menorca holidays June July August 2026 Ireland cheap deals`
5. If the user specified a UK origin or no Irish deals were found, also search: `cheap flights Menorca summer 2026 [origin] easyJet Ryanair Jet2`

## Filtering Rules

- Include **only** departures between June 1 and August 15 (return date may extend beyond Aug 15)
- Exclude deals above the budget per person
- For package holidays, **prioritise** those with accommodation in or near: Cala'n Bosch, Son Xoriguer, or Cala Galdana (all southwest Menorca)

## Output Format

Present results as a ranked markdown table sorted by total price per person (cheapest first):

| # | Departs | Returns | Nights | From | Price/person | Hotel / Area | Provider | Link |
|---|---------|---------|--------|------|-------------|--------------|----------|------|

After the table:
- Highlight the single **best value deal** with a brief note on why it stands out
- Flag any deal under €350/person as exceptional value
- Note: *Prices last searched: [current date and time]*

If no deals are found within the budget, show the 5 cheapest found regardless of budget and note the budget was exceeded.

If web search returns no relevant results, explain what was searched and suggest the user check Ryanair.com, Aerlingus.com, Sunway.ie, and Skyscanner.ie directly for Menorca (MAH) departures.
