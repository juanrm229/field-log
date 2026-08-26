from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from seed_data import DEFAULT_NOTEBOOKS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

VARIANTS = {"orange", "paper", "blue", "forest", "night"}

STUDIO_PASSWORD = os.environ.get("STUDIO_PASSWORD", "koda3am")


def require_studio_key(x_studio_key: Optional[str]):
    if x_studio_key != STUDIO_PASSWORD:
        raise HTTPException(status_code=401, detail="invalid studio key")


class StudioAuth(BaseModel):
    password: str


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or str(uuid.uuid4())[:8]


# ---------- Models ----------
class Chapter(BaseModel):
    title: str = ""
    body: str = ""


class Notebook(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    label: str
    cover_title: str = "FIELD LOG"
    subtitle: List[str] = []
    variant: str = "paper"
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotebookCreate(BaseModel):
    label: str
    slug: Optional[str] = None
    cover_title: str = "FIELD LOG"
    subtitle: List[str] = []
    variant: str = "paper"
    order: Optional[int] = None


class NotebookUpdate(BaseModel):
    label: Optional[str] = None
    cover_title: Optional[str] = None
    subtitle: Optional[List[str]] = None
    variant: Optional[str] = None
    order: Optional[int] = None


class Entry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    notebook_id: str
    type: str = "piece"  # piece | about | kind
    category: str = ""
    title: str = ""
    date: str = ""
    meta: str = ""
    body: str = ""
    chapters: List[Chapter] = []
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EntryCreate(BaseModel):
    notebook_id: str
    type: str = "piece"
    category: str = ""
    title: str = ""
    date: str = ""
    meta: str = ""
    body: str = ""
    chapters: List[Chapter] = []
    order: Optional[int] = None


class EntryUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None
    meta: Optional[str] = None
    body: Optional[str] = None
    chapters: Optional[List[Chapter]] = None
    order: Optional[int] = None


# ---------- Helpers ----------
def clean(doc):
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc


async def next_order(collection, query=None):
    query = query or {}
    last = await db[collection].find(query).sort("order", -1).to_list(1)
    return (last[0]["order"] + 1) if last else 0


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Field Log API"}


@api_router.get("/notebooks")
async def list_notebooks():
    notebooks = await db.notebooks.find().sort("order", 1).to_list(100)
    return [clean(n) for n in notebooks]


@api_router.post("/studio/auth")
async def studio_auth(payload: StudioAuth):
    if payload.password != STUDIO_PASSWORD:
        raise HTTPException(status_code=401, detail="wrong password")
    return {"ok": True}


@api_router.post("/notebooks")
async def create_notebook(payload: NotebookCreate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    if payload.variant not in VARIANTS:
        raise HTTPException(status_code=400, detail=f"variant must be one of {sorted(VARIANTS)}")
    slug = slugify(payload.slug or payload.label)
    existing = await db.notebooks.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"
    order = payload.order if payload.order is not None else await next_order("notebooks")
    nb = Notebook(slug=slug, label=payload.label, cover_title=payload.cover_title,
                  subtitle=payload.subtitle, variant=payload.variant, order=order)
    await db.notebooks.insert_one(nb.model_dump())
    return nb.model_dump()


@api_router.put("/notebooks/{notebook_id}")
async def update_notebook(notebook_id: str, payload: NotebookUpdate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "variant" in updates and updates["variant"] not in VARIANTS:
        raise HTTPException(status_code=400, detail=f"variant must be one of {sorted(VARIANTS)}")
    if not updates:
        raise HTTPException(status_code=400, detail="no fields to update")
    result = await db.notebooks.update_one({"id": notebook_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="notebook not found")
    nb = await db.notebooks.find_one({"id": notebook_id})
    return clean(nb)


@api_router.delete("/notebooks/{notebook_id}")
async def delete_notebook(notebook_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.notebooks.delete_one({"id": notebook_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="notebook not found")
    await db.entries.delete_many({"notebook_id": notebook_id})
    return {"deleted": True}


@api_router.get("/notebooks/{slug}/full")
async def notebook_full(slug: str):
    nb = await db.notebooks.find_one({"slug": slug})
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    entries = await db.entries.find({"notebook_id": nb["id"]}).sort("order", 1).to_list(500)
    return {"notebook": clean(nb), "entries": [clean(e) for e in entries]}


@api_router.post("/entries")
async def create_entry(payload: EntryCreate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    nb = await db.notebooks.find_one({"id": payload.notebook_id})
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    if payload.type not in {"piece", "about", "kind"}:
        raise HTTPException(status_code=400, detail="type must be piece, about or kind")
    order = payload.order if payload.order is not None else await next_order("entries", {"notebook_id": payload.notebook_id})
    entry = Entry(**{**payload.model_dump(exclude={"order"}), "order": order})
    await db.entries.insert_one(entry.model_dump())
    return entry.model_dump()


@api_router.put("/entries/{entry_id}")
async def update_entry(entry_id: str, payload: EntryUpdate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "type" in updates and updates["type"] not in {"piece", "about", "kind"}:
        raise HTTPException(status_code=400, detail="type must be piece, about or kind")
    if not updates:
        raise HTTPException(status_code=400, detail="no fields to update")
    result = await db.entries.update_one({"id": entry_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="entry not found")
    e = await db.entries.find_one({"id": entry_id})
    return clean(e)


@api_router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="entry not found")
    return {"deleted": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_if_empty():
    count = await db.notebooks.count_documents({})
    if count > 0:
        return
    logger.info("Seeding default notebooks & entries...")
    for i, nb_data in enumerate(DEFAULT_NOTEBOOKS):
        nb = Notebook(slug=nb_data["slug"], label=nb_data["label"], cover_title=nb_data.get("cover_title", "FIELD LOG"),
                      subtitle=nb_data["subtitle"], variant=nb_data["variant"], order=i)
        await db.notebooks.insert_one(nb.model_dump())
        for j, e in enumerate(nb_data["entries"]):
            entry = Entry(notebook_id=nb.id, order=j, **e)
            await db.entries.insert_one(entry.model_dump())
    logger.info("Seed complete.")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
