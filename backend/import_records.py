"""Import an explicit JSON export, preserving IDs; dry-run is the default."""
import argparse
import asyncio
import json
from pathlib import Path

from dotenv import load_dotenv
from store import db

ALLOWED = {'notebooks', 'entries', 'characters', 'moments', 'journal_entries',
           'settings', 'now_writing', 'reactions', 'ideas', 'guestbook', 'subscribers'}


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    data = json.loads(Path(args.file).read_text(encoding='utf-8'))
    if not isinstance(data, dict) or set(data) - ALLOWED:
        raise ValueError('Expected an object containing known collections')
    prepared = []
    for name, rows in data.items():
        if not isinstance(rows, list):
            raise ValueError(f'{name} must be a list')
        for source in rows:
            row = dict(source)
            # Mongo-generated ObjectIds are irrelevant; singleton string keys matter.
            if isinstance(row.get('_id'), dict) or row.get('id'):
                row.pop('_id', None)
            if name == 'settings' and row.get('_id') == 'music':
                continue
            if not (row.get('id') or isinstance(row.get('_id'), str) or row.get('entry_id')):
                raise ValueError(f'Missing stable ID in {name}')
            if name == 'reactions' and not row.get('id'):
                row['_id'] = row['entry_id']
            prepared.append((name, row))
        print(f'{name}: {len(rows)} records supplied')
    if not args.apply:
        print('Dry run only. Review the export, then add --apply to insert.')
        return
    # Check all keys before writing; never replace an existing database row.
    for name, row in prepared:
        key = '_id' if '_id' in row else 'id'
        if await getattr(db, name).find_one({key: row[key]}):
            raise ValueError(f'Existing record in {name}; import stopped before writing')
    for name, row in prepared:
        await getattr(db, name).insert_one(row)
    print(f'Imported {len(prepared)} records. Original files were not changed.')


if __name__ == '__main__':
    load_dotenv(Path(__file__).parent / '.env')
    asyncio.run(main())
