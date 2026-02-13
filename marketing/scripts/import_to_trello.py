"""
Ops for Shops - Trello Import Script
Imports prospects from CSV into a Trello board for pipeline management
"""

import os
import sys
import csv
import requests
from pathlib import Path
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Trello API Configuration
API_KEY = os.getenv('TRELLO_API_KEY')
TOKEN = os.getenv('TRELLO_TOKEN')
BASE_URL = 'https://api.trello.com/1'

# Color mapping for labels (Trello has 10 colors)
LABEL_COLORS = ['blue', 'green', 'orange', 'red', 'purple', 'pink', 'lime', 'sky', 'yellow', 'black']

# Priority color mapping
PRIORITY_COLORS = {
    '1-HIGH': 'red',
    '2-MED': 'yellow',
    '2-STRATEGIC': 'yellow',
    '3-MED': 'orange',
    '3-LOW': 'green',
    '3-STRATEGIC': 'purple',
    '3-WATCH': 'sky'
}


def find_board_by_name(board_name):
    """Find a board by name"""
    url = f"{BASE_URL}/members/me/boards"
    query = {
        'key': API_KEY,
        'token': TOKEN,
        'fields': 'id,name'
    }

    response = requests.get(url, params=query)
    response.raise_for_status()
    boards = response.json()

    for board in boards:
        if board['name'] == board_name:
            return board['id']
    return None


def create_board(board_name):
    """Create a new Trello board"""
    url = f"{BASE_URL}/boards"
    query = {
        'key': API_KEY,
        'token': TOKEN,
        'name': board_name,
        'defaultLists': 'false'  # We'll create custom lists
    }

    response = requests.post(url, params=query)
    response.raise_for_status()
    board = response.json()
    print(f"✓ Created board: {board_name}")
    return board['id']


def get_existing_lists(board_id):
    """Get existing lists from a board"""
    url = f"{BASE_URL}/boards/{board_id}/lists"
    query = {
        'key': API_KEY,
        'token': TOKEN
    }

    response = requests.get(url, params=query)
    response.raise_for_status()
    lists_data = response.json()

    lists = {}
    for list_data in lists_data:
        lists[list_data['name']] = list_data['id']

    return lists


def create_lists(board_id):
    """Create the pipeline lists"""
    list_names = [
        'Prospects',
        'Email Drafted',
        'Sent',
        'Replied',
        'Meeting Booked',
        'Not Interested',
        'Follow-up'
    ]

    lists = {}
    for name in list_names:
        url = f"{BASE_URL}/lists"
        query = {
            'key': API_KEY,
            'token': TOKEN,
            'name': name,
            'idBoard': board_id
        }

        response = requests.post(url, params=query)
        response.raise_for_status()
        list_data = response.json()
        lists[name] = list_data['id']
        print(f"✓ Created list: {name}")

    return lists


def ensure_lists(board_id):
    """Get existing lists or create missing ones"""
    existing_lists = get_existing_lists(board_id)

    required_lists = [
        'Prospects',
        'Email Drafted',
        'Sent',
        'Replied',
        'Meeting Booked',
        'Not Interested',
        'Follow-up'
    ]

    for name in required_lists:
        if name not in existing_lists:
            url = f"{BASE_URL}/lists"
            query = {
                'key': API_KEY,
                'token': TOKEN,
                'name': name,
                'idBoard': board_id
            }

            response = requests.post(url, params=query)
            response.raise_for_status()
            list_data = response.json()
            existing_lists[name] = list_data['id']
            print(f"✓ Created missing list: {name}")

    return existing_lists


def get_existing_labels(board_id):
    """Get existing labels from a board"""
    url = f"{BASE_URL}/boards/{board_id}/labels"
    query = {
        'key': API_KEY,
        'token': TOKEN
    }

    response = requests.get(url, params=query)
    response.raise_for_status()
    labels_data = response.json()

    labels = {}
    for label_data in labels_data:
        if label_data['name']:  # Only include named labels
            labels[label_data['name']] = label_data['id']

    return labels


def create_labels(board_id, verticals):
    """Create labels for verticals and priorities"""
    labels = {}

    # Create vertical labels
    for idx, vertical in enumerate(verticals):
        color = LABEL_COLORS[idx % len(LABEL_COLORS)]
        url = f"{BASE_URL}/labels"
        query = {
            'key': API_KEY,
            'token': TOKEN,
            'name': vertical,
            'color': color,
            'idBoard': board_id
        }

        response = requests.post(url, params=query)
        response.raise_for_status()
        label_data = response.json()
        labels[vertical] = label_data['id']
        print(f"✓ Created label: {vertical} ({color})")

    # Create priority labels
    for priority, color in PRIORITY_COLORS.items():
        url = f"{BASE_URL}/labels"
        query = {
            'key': API_KEY,
            'token': TOKEN,
            'name': f"Priority: {priority}",
            'color': color,
            'idBoard': board_id
        }

        response = requests.post(url, params=query)
        response.raise_for_status()
        label_data = response.json()
        labels[f"Priority: {priority}"] = label_data['id']
        print(f"✓ Created priority label: {priority} ({color})")

    return labels


def ensure_labels(board_id, verticals):
    """Get existing labels or create missing ones"""
    existing_labels = get_existing_labels(board_id)

    # Ensure vertical labels exist
    for idx, vertical in enumerate(verticals):
        if vertical not in existing_labels:
            color = LABEL_COLORS[idx % len(LABEL_COLORS)]
            url = f"{BASE_URL}/labels"
            query = {
                'key': API_KEY,
                'token': TOKEN,
                'name': vertical,
                'color': color,
                'idBoard': board_id
            }

            response = requests.post(url, params=query)
            response.raise_for_status()
            label_data = response.json()
            existing_labels[vertical] = label_data['id']
            print(f"✓ Created new vertical label: {vertical} ({color})")

    # Ensure priority labels exist
    for priority, color in PRIORITY_COLORS.items():
        priority_label = f"Priority: {priority}"
        if priority_label not in existing_labels:
            url = f"{BASE_URL}/labels"
            query = {
                'key': API_KEY,
                'token': TOKEN,
                'name': priority_label,
                'color': color,
                'idBoard': board_id
            }

            response = requests.post(url, params=query)
            response.raise_for_status()
            label_data = response.json()
            existing_labels[priority_label] = label_data['id']
            print(f"✓ Created new priority label: {priority} ({color})")

    return existing_labels


def get_existing_cards(board_id):
    """Get all existing cards from a board"""
    url = f"{BASE_URL}/boards/{board_id}/cards"
    query = {
        'key': API_KEY,
        'token': TOKEN
    }

    response = requests.get(url, params=query)
    response.raise_for_status()
    cards = response.json()

    # Extract company names from card titles (format: "Company Name - Contact Name")
    existing_companies = set()
    for card in cards:
        # Split on ' - ' and take the first part (company name)
        company = card['name'].split(' - ')[0].strip()
        existing_companies.add(company)

    return existing_companies


def create_card(list_id, prospect, labels_map):
    """Create a Trello card for a prospect"""
    # Build card title
    name = prospect.get('Name', 'Unknown')
    recipient = prospect.get('Outreach Recipient', '')
    title = f"{name} - {recipient}" if recipient else name

    # Build card description
    description = f"""**Contact Info:**
- Name: {prospect.get('Outreach Recipient', 'N/A')}
- Title: {prospect.get('Recipient Title', 'N/A')}
- Email: {prospect.get('Email', 'N/A')}
- Phone: {prospect.get('Phone', 'N/A')}
- Website: {prospect.get('Website', 'N/A')}

**Company Details:**
- Size: {prospect.get('Size', 'N/A')}
- Vertical: {prospect.get('Vertical', 'N/A')}
- Priority: {prospect.get('Priority', 'N/A')}

**Pain Signals:**
{prospect.get('Pain Signal Summary', 'None identified')}

**Tech Stack:**
{prospect.get('Tech Stack Clues', 'Not disclosed')}

**Notes:**
{prospect.get('Notes', 'None')}

---
*Email Confidence: {prospect.get('Email Confidence', 'N/A')}*
"""

    # Create the card
    url = f"{BASE_URL}/cards"
    query = {
        'key': API_KEY,
        'token': TOKEN,
        'idList': list_id,
        'name': title,
        'desc': description
    }

    response = requests.post(url, params=query)
    response.raise_for_status()
    card = response.json()

    # Add labels (vertical + priority)
    label_ids = []

    vertical = prospect.get('Vertical', '')
    if vertical in labels_map:
        label_ids.append(labels_map[vertical])

    priority = prospect.get('Priority', '')
    priority_label = f"Priority: {priority}"
    if priority_label in labels_map:
        label_ids.append(labels_map[priority_label])

    # Attach labels to card
    for label_id in label_ids:
        url = f"{BASE_URL}/cards/{card['id']}/idLabels"
        query = {
            'key': API_KEY,
            'token': TOKEN,
            'value': label_id
        }
        requests.post(url, params=query)

    return card['id']


def main():
    """Main import process"""
    print("\n" + "="*60)
    print("Ops for Shops - Trello Import")
    print("="*60 + "\n")

    # Verify credentials
    if not API_KEY or not TOKEN:
        print("❌ Error: Missing Trello API credentials")
        print("Please create a .env file with your TRELLO_API_KEY and TRELLO_TOKEN")
        print("See .env.example for template")
        return

    # Read CSV
    csv_path = Path(__file__).parent.parent / 'prospects' / 'prospect-list.csv'
    if not csv_path.exists():
        print(f"❌ Error: CSV not found at {csv_path}")
        return

    print(f"Reading prospects from: {csv_path}")

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        prospects = list(reader)

    print(f"✓ Found {len(prospects)} prospects in CSV\n")

    # Get unique verticals
    verticals = sorted(set(p['Vertical'] for p in prospects if p.get('Vertical')))
    print(f"✓ Found {len(verticals)} verticals: {', '.join(verticals)}\n")

    # Get or create board
    if len(sys.argv) > 1:
        board_name = sys.argv[1]
        print(f"Using board name from command line: {board_name}\n")
    else:
        board_name = input("Enter board name (default: 'Ops for Shops - Outreach Pipeline'): ").strip()
        if not board_name:
            board_name = 'Ops for Shops - Outreach Pipeline'

    board_id = find_board_by_name(board_name)

    if board_id:
        print(f"✓ Found existing board: {board_name}")
        print("  Mode: UPDATE (will only add new prospects)\n")

        # Get existing cards to check for duplicates
        print("Fetching existing cards...")
        existing_companies = get_existing_cards(board_id)
        print(f"✓ Found {len(existing_companies)} existing prospects on board\n")

        # Ensure lists and labels exist
        print("Checking lists and labels...")
        lists = ensure_lists(board_id)
        labels = ensure_labels(board_id, verticals)
        print()

    else:
        print(f"✓ Board not found, creating new board: {board_name}")
        print("  Mode: CREATE (will import all prospects)\n")

        existing_companies = set()

        board_id = create_board(board_name)
        print()

        # Create lists
        print("Creating lists...")
        lists = create_lists(board_id)
        print()

        # Create labels
        print("Creating labels...")
        labels = create_labels(board_id, verticals)
        print()

    # Filter to only new prospects
    new_prospects = [
        p for p in prospects
        if p.get('Name', '').strip() not in existing_companies
    ]

    print(f"Importing {len(new_prospects)} new prospects (skipping {len(prospects) - len(new_prospects)} existing)...")
    prospects_list_id = lists['Prospects']

    imported = 0
    for idx, prospect in enumerate(new_prospects, 1):
        try:
            create_card(prospects_list_id, prospect, labels)
            imported += 1
            if idx % 10 == 0:
                print(f"  Imported {idx}/{len(new_prospects)}...")
        except Exception as e:
            print(f"  ⚠ Failed to import {prospect.get('Name', 'Unknown')}: {e}")

    print(f"\n✓ Successfully imported {imported} new prospects")
    print(f"  Skipped: {len(prospects) - len(new_prospects)} (already exist)")
    print(f"  Total on board: {len(existing_companies) + imported}")

    # Get board URL
    board_url = f"https://trello.com/b/{board_id}"
    print(f"\n{'='*60}")
    print(f"✓ Import complete!")
    print(f"{'='*60}")
    print(f"\nOpen your board: {board_url}\n")


if __name__ == '__main__':
    main()
