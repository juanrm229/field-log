"""PostgreSQL JSONB records through Supabase's server-only Data API.

Keep the existing API's document shapes during migration. Filtering happens in
the server (never in the browser); mutations run atomically inside PostgreSQL.
This is intended for a small personal publication, not a large search engine.
"""
import os
import re
import uuid
from types import SimpleNamespace

import httpx
from fastapi import HTTPException
from fastapi.encoders import jsonable_encoder


async def request(method, path, **kwargs):
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise HTTPException(503, "Database configuration is incomplete")
    headers = {"apikey": key}
    # New secret keys use apikey; legacy service_role JWTs also use Bearer.
    if not key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {key}"
    headers.update(kwargs.pop("headers", {}))
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.request(method, url + path, headers=headers, **kwargs)
    except httpx.RequestError:
        raise HTTPException(503, "Storage service could not be reached") from None
    if response.is_error:
        # Never return upstream bodies: they may contain private record values.
        raise HTTPException(503, "Storage request failed; check Supabase schema and server configuration")
    return response


def values(doc, path):
    if not path:
        return [doc]
    if isinstance(doc, list):
        return [v for item in doc for v in values(item, path)]
    if not isinstance(doc, dict) or path[0] not in doc:
        return []
    return values(doc[path[0]], path[1:])


def matches(doc, query):
    for field, expected in query.items():
        if field == "$or":
            if not any(matches(doc, branch) for branch in expected):
                return False
            continue
        found = values(doc, field.split("."))
        if isinstance(expected, dict):
            for op, operand in expected.items():
                if op == "$ne" and any(v == operand for v in found):
                    return False
                if op == "$exists" and bool(found) != operand:
                    return False
                if op == "$regex" and not any(re.search(operand, str(v), re.I if "i" in expected.get("$options", "") else 0) for v in found):
                    return False
                if op not in ("$ne", "$exists", "$regex", "$options"):
                    raise ValueError(f"Unsupported query operator: {op}")
        elif not any(v == expected for v in found):
            return False
    return True


class Cursor:
    def __init__(self, collection, query):
        self.collection, self.query, self.order = collection, query, None

    def sort(self, field, direction):
        self.order = (field, direction)
        return self

    async def to_list(self, limit):
        rows, offset = [], 0
        while True:
            response = await request("GET", "/rest/v1/field_log_records", params={
                "collection": f"eq.{self.collection}", "select": "document", "order": "record_key.asc",
                "offset": offset, "limit": 500,
            })
            page = response.json()
            rows.extend(row["document"] for row in page if matches(row["document"], self.query))
            offset += len(page)
            if len(page) < 500:
                break
        if self.order:
            field, direction = self.order
            rows.sort(key=lambda d: (d.get(field) is not None, d.get(field)), reverse=direction < 0)
        return rows if limit is None else rows[:limit]


class Collection:
    def __init__(self, name):
        self.name = name

    def find(self, query=None, projection=None):
        return Cursor(self.name, query or {})

    async def find_one(self, query):
        rows = await self.find(query).to_list(1)
        return rows[0] if rows else None

    async def count_documents(self, query):
        return len(await self.find(query).to_list(None))

    async def insert_one(self, doc):
        doc = jsonable_encoder(doc)
        key = str(doc.get("_id") or doc.get("id") or uuid.uuid4())
        await request("POST", "/rest/v1/field_log_records", json={
            "collection": self.name, "record_key": key, "document": doc,
        })
        return SimpleNamespace(inserted_id=key)

    async def update_one(self, query, patch, upsert=False):
        doc = await self.find_one(query)
        if doc is None and not upsert:
            return SimpleNamespace(matched_count=0)
        base = doc or query
        # Deterministic singleton/reaction keys make concurrent upserts converge.
        key = str(base.get("_id") or base.get("id") or base.get("entry_id") or uuid.uuid4())
        result = await request("POST", "/rest/v1/rpc/field_log_patch", json={
            "p_collection": self.name, "p_key": key, "p_patch": jsonable_encoder(patch),
            "p_initial": jsonable_encoder(query) if upsert else None,
        })
        return SimpleNamespace(matched_count=int(result.json()))

    async def update_many(self, query, patch):
        rows = await self.find(query).to_list(None)
        for row in rows:
            await self.update_one({"id": row["id"]}, patch)
        return SimpleNamespace(matched_count=len(rows))

    async def delete_one(self, query):
        doc = await self.find_one(query)
        if not doc:
            return SimpleNamespace(deleted_count=0)
        key = str(doc.get("_id") or doc.get("id") or doc.get("entry_id"))
        result = await request("DELETE", "/rest/v1/field_log_records", params={
            "collection": f"eq.{self.name}", "record_key": f"eq.{key}",
        }, headers={"Prefer": "return=representation"})
        return SimpleNamespace(deleted_count=len(result.json()))

    async def delete_many(self, query):
        rows = await self.find(query).to_list(None)
        count = 0
        for row in rows:
            key = "_id" if "_id" in row else "id"
            count += (await self.delete_one({key: row[key]})).deleted_count
        return SimpleNamespace(deleted_count=count)


class Database:
    def __getitem__(self, name):
        return Collection(name)

    def __getattr__(self, name):
        return Collection(name)


db = Database()
