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

VARIANTS = {"orange", "paper", "blue", "forest", "night", "crimson", "sand", "mint", "slate"}

REACTION_TYPES = {"heart", "sparkles", "feather", "coffee"}

STUDIO_PASSWORD = os.environ.get("STUDIO_PASSWORD", "koda3am")


def require_studio_key(x_studio_key: Optional[str]):
    if x_studio_key != STUDIO_PASSWORD:
        raise HTTPException(status_code=401, detail="invalid studio key")


class StudioAuth(BaseModel):
    password: str


class ReactionCreate(BaseModel):
    type: str


class IdeaCreate(BaseModel):
    name: str = ""
    idea: str


class Idea(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    idea: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


NOTE_COLORS = {"lemon", "peach", "mint", "sky", "lilac"}


class GuestNoteCreate(BaseModel):
    name: str = ""
    message: str
    color: str = "lemon"


class GuestNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    message: str
    color: str = "lemon"
    approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NowWritingUpdate(BaseModel):
    title: Optional[str] = None
    goal_words: Optional[int] = None
    current_words: Optional[int] = None
    note: Optional[str] = None
    active: Optional[bool] = None


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
    draft: bool = False
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
    draft: bool = False
    order: Optional[int] = None


class EntryUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None
    meta: Optional[str] = None
    body: Optional[str] = None
    chapters: Optional[List[Chapter]] = None
    draft: Optional[bool] = None
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
async def notebook_full(slug: str, x_studio_key: Optional[str] = Header(None)):
    nb = await db.notebooks.find_one({"slug": slug})
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    query = {"notebook_id": nb["id"]}
    if x_studio_key != STUDIO_PASSWORD:
        query["draft"] = {"$ne": True}
    entries = await db.entries.find(query).sort("order", 1).to_list(500)
    return {"notebook": clean(nb), "entries": [clean(e) for e in entries]}


@api_router.get("/search")
async def search_entries(q: str = ""):
    q = q.strip()
    if len(q) < 2:
        return []
    rx = {"$regex": re.escape(q), "$options": "i"}
    cursor = db.entries.find({
        "draft": {"$ne": True},
        "$or": [
            {"title": rx},
            {"body": rx},
            {"category": rx},
            {"meta": rx},
            {"chapters.title": rx},
            {"chapters.body": rx},
        ],
    }).sort("order", 1).to_list(20)
    entries = await cursor
    notebooks = {n["id"]: n for n in await db.notebooks.find().to_list(100)}
    results = []
    for e in entries:
        nb = notebooks.get(e["notebook_id"])
        if not nb:
            continue
        # build a small snippet around the match in body
        body = e.get("body", "") or ""
        idx = body.lower().find(q.lower())
        snippet = body[max(0, idx - 40): idx + 80].strip() if idx >= 0 else body[:110].strip()
        results.append({
            "id": e["id"],
            "title": e.get("title", ""),
            "category": e.get("category", ""),
            "type": e.get("type", "piece"),
            "snippet": snippet,
            "notebook_slug": nb["slug"],
            "notebook_label": nb["label"],
        })
    return results


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


# ---------- Reader reactions ----------
def empty_counts():
    return {t: 0 for t in sorted(REACTION_TYPES)}


@api_router.get("/entries/{entry_id}/reactions")
async def get_reactions(entry_id: str):
    doc = await db.reactions.find_one({"entry_id": entry_id})
    counts = empty_counts()
    if doc:
        counts.update({k: v for k, v in doc.get("counts", {}).items() if k in REACTION_TYPES})
    return counts


@api_router.post("/entries/{entry_id}/react")
async def add_reaction(entry_id: str, payload: ReactionCreate):
    if payload.type not in REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of {sorted(REACTION_TYPES)}")
    entry = await db.entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="entry not found")
    await db.reactions.update_one(
        {"entry_id": entry_id},
        {"$inc": {f"counts.{payload.type}": 1}},
        upsert=True,
    )
    return await get_reactions(entry_id)


# ---------- Story idea suggestions ----------
@api_router.post("/ideas")
async def submit_idea(payload: IdeaCreate):
    idea_text = payload.idea.strip()
    if len(idea_text) < 5:
        raise HTTPException(status_code=400, detail="idea is too short")
    idea = Idea(name=payload.name.strip()[:60], idea=idea_text[:1000])
    await db.ideas.insert_one(idea.model_dump())
    return idea.model_dump()


@api_router.get("/ideas")
async def list_ideas(x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    ideas = await db.ideas.find().sort("created_at", -1).to_list(200)
    return [clean(i) for i in ideas]


@api_router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.ideas.delete_one({"id": idea_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="idea not found")
    return {"deleted": True}


# ---------- Guestbook wall (sticky notes, moderated) ----------
@api_router.post("/guestbook")
async def submit_note(payload: GuestNoteCreate):
    msg = payload.message.strip()
    if len(msg) < 3:
        raise HTTPException(status_code=400, detail="message is too short")
    color = payload.color if payload.color in NOTE_COLORS else "lemon"
    note = GuestNote(name=payload.name.strip()[:40], message=msg[:280], color=color)
    await db.guestbook.insert_one(note.model_dump())
    return note.model_dump()


@api_router.get("/guestbook")
async def list_notes():
    notes = await db.guestbook.find({"approved": True}).sort("created_at", -1).to_list(100)
    return [clean(n) for n in notes]


@api_router.get("/guestbook/all")
async def list_all_notes(x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    notes = await db.guestbook.find().sort("created_at", -1).to_list(300)
    return [clean(n) for n in notes]


@api_router.put("/guestbook/{note_id}/approve")
async def approve_note(note_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.guestbook.update_one({"id": note_id}, {"$set": {"approved": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="note not found")
    return {"approved": True}


@api_router.delete("/guestbook/{note_id}")
async def delete_note(note_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.guestbook.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="note not found")
    return {"deleted": True}


# ---------- Now Writing (singleton progress) ----------
NOW_DEFAULTS = {"title": "", "goal_words": 0, "current_words": 0, "note": "", "active": False}


@api_router.get("/now-writing")
async def get_now_writing():
    doc = await db.now_writing.find_one({"_id": "singleton"})
    if not doc:
        return {**NOW_DEFAULTS, "updated_at": None}
    doc.pop("_id", None)
    return doc


@api_router.put("/now-writing")
async def update_now_writing(payload: NowWritingUpdate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.now_writing.update_one({"_id": "singleton"}, {"$set": updates}, upsert=True)
    return await get_now_writing()


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
