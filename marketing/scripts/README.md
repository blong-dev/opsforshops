# Trello Import Script

Imports your prospect list from CSV into a Trello board for pipeline management.

## Setup

1. **Install dependencies:**
   ```bash
   cd C:\Quorum\OpsForShops\marketing\scripts
   pip install -r requirements.txt
   ```

2. **Create your `.env` file:**
   ```bash
   cp .env.example .env
   ```

3. **Add your Trello credentials to `.env`:**
   - Open `.env` in a text editor
   - Replace `your_api_key_here` with your actual API key
   - Replace `your_token_here` with your actual token

## Run the Import

```bash
python import_to_trello.py
```

The script will:
- ✓ Create a new Trello board
- ✓ Create 7 pipeline lists (Prospects → Meeting Booked)
- ✓ Create labels for all verticals (dynamically detected from CSV)
- ✓ Create priority labels (HIGH, MED, LOW, etc.)
- ✓ Import all 283 prospects as cards
- ✓ Give you the board URL when done

## What Gets Created

**Lists:**
1. Prospects
2. Email Drafted
3. Sent
4. Replied
5. Meeting Booked
6. Not Interested
7. Follow-up

**Labels:**
- One label per vertical (auto-detected)
- Priority labels (HIGH, MED, LOW, STRATEGIC, WATCH)

**Each Card Contains:**
- Contact name and company
- Email, phone, website
- Company size and vertical
- Pain signals
- Tech stack clues
- Notes
- Priority level

## Re-running the Script (Adding New Prospects)

**When you add new prospects to your CSV:**

1. Just run the script again:
   ```bash
   python import_to_trello.py
   ```

2. Enter the same board name (e.g., "Campaign 1")

3. The script will:
   - ✓ Find your existing board
   - ✓ Check what prospects are already there
   - ✓ Only import NEW prospects (no duplicates!)
   - ✓ Create labels for any new verticals you added
   - ✓ Report: "Imported 15 new, skipped 283 existing"

**Example:**
- First run: 283 prospects → creates board, imports all 283
- You add 20 more to CSV (total: 303)
- Second run: Same board name → imports only the 20 new ones
- Board now has: 303 total prospects

## Troubleshooting

**"Missing Trello API credentials"**
→ Make sure you created `.env` and added your API key and token

**"CSV not found"**
→ Make sure `prospect-list.csv` is in `../prospects/prospect-list.csv`

**Import fails partway through**
→ Check the error message - usually a data formatting issue in the CSV
