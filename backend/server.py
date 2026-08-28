from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
import os
import re
import asyncio
import logging
import resend
from bson import ObjectId
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from seed_data import DEFAULT_NOTEBOOKS
from simpang_sample import SAMPLE_CHARACTERS, SAMPLE_MOMENTS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

def required_env(name: str) -> str:
    """Fail at boot with a readable message rather than a KeyError in a log tail."""
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(
            f"{name} is not set. Locally: copy backend/.env.example to backend/.env. "
            f"On a host: set it in the service's environment variables."
        )
    return value


client = AsyncIOMotorClient(required_env("MONGO_URL"))
db = client[required_env("DB_NAME")]

app = FastAPI()
api_router = APIRouter(prefix="/api")

VARIANTS = {"orange", "paper", "blue", "forest", "night", "crimson", "sand", "mint", "slate"}

REACTION_TYPES = {"heart", "sparkles", "feather", "coffee"}

# Deliberately no default: a password written into the source would unlock
# /studio on every deployment whose operator forgot to set this.
STUDIO_PASSWORD = required_env("STUDIO_PASSWORD")

resend.api_key = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

EMAIL_RX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# ---------- Audio storage (background music, stored in MongoDB GridFS) ----------
music_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="music")
_music_cache = {}


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


class SubscriberCreate(BaseModel):
    email: str
    name: str = ""


class Subscriber(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotifyRequest(BaseModel):
    subject: str
    message: str
    link: str = ""


class NowWritingUpdate(BaseModel):
    title: Optional[str] = None
    goal_words: Optional[int] = None
    current_words: Optional[int] = None
    note: Optional[str] = None
    active: Optional[bool] = None


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or str(uuid.uuid4())[:8]


async def unique_entry_slug(title: str, preferred: str = "", exclude_id: str = "") -> str:
    """A slug nobody else is using. Falls back to the title, then to a fragment
    of the id when the title is empty or all punctuation."""
    base = slugify(preferred or title or "")
    query = {"slug": base}
    if exclude_id:
        query["id"] = {"$ne": exclude_id}
    if await db.entries.find_one(query):
        return f"{base}-{str(uuid.uuid4())[:4]}"
    return base


# ---------- Models ----------
class SiteSettings(BaseModel):
    """Everything the site says about itself that used to be typed into the
    source: the name on the covers, the meta description, and every line of the
    inside-cover page. Stored as one document so the owner can change any of it
    from Studio without a deploy."""
    # identity
    site_name: str = "Commonplace Book"
    site_tagline: str = "stories, poems & things kind people said"
    description: str = ""
    owner_name: str = "Juan"
    # inside front cover
    coordinates: List[str] = []
    start_date: str = ""
    start_location: str = ""
    completion_date: str = ""
    completion_location: str = ""
    contact_local: str = ""
    contact_domain: str = ""
    footer: str = ""
    # inside back cover
    back_lines: List[str] = []
    back_end: str = "fin."


class Chapter(BaseModel):
    title: str = ""
    body: str = ""


class Notebook(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str
    label: str
    cover_title: str = "COMMONPLACE BOOK"
    subtitle: List[str] = []
    variant: str = "paper"
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotebookCreate(BaseModel):
    label: str
    slug: Optional[str] = None
    cover_title: str = "COMMONPLACE BOOK"
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
    # Readable address for a piece: /read/{slug}. Assigned once and then left
    # alone even if the title changes — a slug that moves breaks every link
    # anyone has already shared.
    slug: str = ""
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
    slug: Optional[str] = None
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
    slug: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    date: Optional[str] = None
    meta: Optional[str] = None
    body: Optional[str] = None
    chapters: Optional[List[Chapter]] = None
    draft: Optional[bool] = None
    order: Optional[int] = None


# ---------- Simpang: fictional journals that cross ----------
# Story time is an integer beat `t`, which is what sorts and positions an entry,
# alongside a free-text `date_label` for the reader. Fiction says "the third day"
# or "no date at all"; forcing that into a date type would erase it.
class Character(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    slug: str = ""
    name: str = ""
    role: str = ""
    variant: str = "orange"          # cover variant, reused as the ink colour
    entry_id: Optional[str] = None   # the piece this character comes from
    t_start: int = 1
    t_end: int = 12
    gaps: List[List[int]] = []       # [[from, to]] — stretches not written yet
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CharacterCreate(BaseModel):
    slug: Optional[str] = None
    name: str = ""
    role: str = ""
    variant: str = "orange"
    entry_id: Optional[str] = None
    t_start: int = 1
    t_end: int = 12
    gaps: List[List[int]] = []
    order: Optional[int] = None


class CharacterUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    variant: Optional[str] = None
    entry_id: Optional[str] = None
    t_start: Optional[int] = None
    t_end: Optional[int] = None
    gaps: Optional[List[List[int]]] = None
    order: Optional[int] = None


class Paragraph(BaseModel):
    """One paragraph of an entry. `protected` is the writer's own mark for the
    lines they consider private; it is carried through rather than dropped, and
    the page gives it a different treatment instead of hiding it."""
    text: str = ""
    protected: bool = False


class EntryLink(BaseModel):
    """A pointer the writer drew between two days by hand.

    These are not derived. A crossing is inferred — two people happened to claim
    the same proposition — but a link is authored, one paragraph pointing at one
    page, and it is the more precise of the two.

    The two kinds are different claims about time and are not interchangeable:
    `node` is the same stretch of days seen from somewhere else (92% of them
    land in the same year), while `echo` is the same thing happening again to
    someone else, a median of eight years later and sometimes thirty-seven.
    """
    kind: str = "node"
    entry_id: str = ""
    character_id: str = ""
    para: int = 0


class Claim(BaseModel):
    """A paragraph that asserts a named proposition, or turns against one.

    The corpus marks these inline — @claims(p_dua_cangkir), @irony(p_karman_mati)
    — so a crossing is simply a proposition more than one person touches, and the
    writer has already decided where those are. `kind` keeps the two apart: a
    claim states the proposition, irony undercuts it.
    """
    key: str = ""
    text: str = ""
    kind: str = "claims"   # claims | irony
    protected: bool = False


class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    character_id: str
    moment_id: Optional[str] = None      # kept for entries written in Studio
    moment_ids: List[str] = []           # every crossing this entry touches
    t: int = 1
    date_label: str = ""
    place: str = ""
    title: str = ""
    body: str = ""
    paragraphs: List[Paragraph] = []
    claims: List[Claim] = []
    links: List[EntryLink] = []          # the writer's own @node / @echo
    source_id: str = ""    # the id in the corpus frontmatter, e.g. k2026
    draft: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JournalEntryCreate(BaseModel):
    character_id: str
    moment_id: Optional[str] = None
    moment_ids: List[str] = []
    t: int = 1
    date_label: str = ""
    place: str = ""
    title: str = ""
    body: str = ""
    paragraphs: List[Paragraph] = []
    claims: List[Claim] = []
    links: List[EntryLink] = []
    source_id: str = ""
    draft: bool = False


class JournalEntryUpdate(BaseModel):
    character_id: Optional[str] = None
    moment_id: Optional[str] = None
    moment_ids: Optional[List[str]] = None
    t: Optional[int] = None
    date_label: Optional[str] = None
    place: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    paragraphs: Optional[List[Paragraph]] = None
    claims: Optional[List[Claim]] = None
    draft: Optional[bool] = None


class Moment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str = ""
    place: str = ""
    t: int = 1
    date_label: str = ""
    character_ids: List[str] = []
    prop: str = ""        # the proposition this crossing is built from, e.g. p_dua_cangkir
    featured: bool = False  # offer this one first — a reader needs one way in
    note: str = ""        # editor's note shown under a contradiction here
    above: bool = True    # draw the map label above or below the node
    hidden: bool = False  # spoiler shield: keep this junction off the public map
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MomentCreate(BaseModel):
    label: str = ""
    place: str = ""
    t: int = 1
    date_label: str = ""
    character_ids: List[str] = []
    prop: str = ""
    featured: bool = False
    note: str = ""
    above: bool = True
    hidden: bool = False


class MomentUpdate(BaseModel):
    label: Optional[str] = None
    place: Optional[str] = None
    t: Optional[int] = None
    date_label: Optional[str] = None
    character_ids: Optional[List[str]] = None
    prop: Optional[str] = None
    featured: Optional[bool] = None
    note: Optional[str] = None
    above: Optional[bool] = None
    hidden: Optional[bool] = None



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
    return {"message": "Commonplace Book API"}


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


SITE_DEFAULTS = SiteSettings(
    description="Novels, short stories, poetry and journals, kept in one place.",
    coordinates=["@kodawrites", "koda.substack.com"],
    start_date="the first rain of 2024",
    start_location="a desk facing a wall",
    contact_local="hello",
    contact_domain="juanmaulana.id",
    footer="juanmaulana.id",
    back_lines=["48 pages / smooth graph paper", "Written by Juan"],
)


@api_router.get("/site")
async def get_site():
    """Falls back field by field, so a setting added after the owner last saved
    still arrives with a sensible value instead of an empty string."""
    doc = await db.settings.find_one({"_id": "site"}) or {}
    doc.pop("_id", None)
    return {**SITE_DEFAULTS.model_dump(), **{k: v for k, v in doc.items() if v not in (None, "")}}


@api_router.put("/site")
async def update_site(payload: SiteSettings, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    await db.settings.update_one({"_id": "site"}, {"$set": payload.model_dump()}, upsert=True)
    return await get_site()


@api_router.get("/read/{slug}")
async def read_by_slug(slug: str):
    """One piece and the notebook it belongs to, addressed by its own name."""
    entry = await db.entries.find_one({"slug": slug})
    if not entry:
        raise HTTPException(status_code=404, detail="piece not found")
    nb = await db.notebooks.find_one({"id": entry["notebook_id"]})
    if not nb:
        raise HTTPException(status_code=404, detail="notebook not found")
    return {"entry": clean(entry), "notebook": clean(nb)}


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
            "slug": e.get("slug", ""),
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
    slug = await unique_entry_slug(payload.title, payload.slug or "")
    entry = Entry(**{**payload.model_dump(exclude={"order", "slug"}), "order": order, "slug": slug})
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

    current = await db.entries.find_one({"id": entry_id})
    if current:
        if "slug" in updates:
            # An explicit rename, which the owner is choosing to make.
            updates["slug"] = await unique_entry_slug(updates.get("title", current.get("title", "")), updates["slug"], entry_id)
        elif not current.get("slug"):
            updates["slug"] = await unique_entry_slug(updates.get("title", current.get("title", "")), "", entry_id)
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


# ---------- Reader mail list (subscribers + notify) ----------
@api_router.post("/subscribers")
async def subscribe(payload: SubscriberCreate):
    email = payload.email.strip().lower()
    if not EMAIL_RX.match(email):
        raise HTTPException(status_code=400, detail="invalid email")
    existing = await db.subscribers.find_one({"email": email})
    if existing:
        return {"ok": True, "already": True}
    sub = Subscriber(email=email, name=payload.name.strip()[:60])
    await db.subscribers.insert_one(sub.model_dump())
    return {"ok": True, "already": False}


@api_router.get("/subscribers")
async def list_subscribers(x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    subs = await db.subscribers.find().sort("created_at", -1).to_list(1000)
    return [clean(s) for s in subs]


@api_router.delete("/subscribers/{sub_id}")
async def delete_subscriber(sub_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.subscribers.delete_one({"id": sub_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="subscriber not found")
    return {"deleted": True}


def notify_html(subject: str, message: str, link: str, wordmark: str, owner: str) -> str:
    btn = (
        f'<tr><td style="padding-top:20px"><a href="{link}" '
        'style="background:#f94b0c;color:#ffffff;text-decoration:none;padding:11px 24px;'
        'border-radius:999px;font-size:13px;display:inline-block">Read it &rarr;</a></td></tr>'
    ) if link else ""
    return (
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ebdc;padding:36px 12px"><tr><td align="center">'
        '<table width="520" cellpadding="0" cellspacing="0" style="background:#fffdf6;border:1px solid #e2dcc8;'
        'border-radius:12px;padding:34px;font-family:Georgia,serif;color:#2a2620">'
        f'<tr><td style="font-size:11px;letter-spacing:3px;color:#f94b0c;text-transform:uppercase;font-family:Courier,monospace">{wordmark}</td></tr>'
        f'<tr><td style="font-size:22px;font-weight:bold;padding-top:12px">{subject}</td></tr>'
        f'<tr><td style="font-size:15px;line-height:1.75;padding-top:14px;white-space:pre-line">{message}</td></tr>'
        f'{btn}'
        f'<tr><td style="font-size:11px;color:#8a857a;padding-top:28px">You are getting this letter because you left your email on {owner}\'s notebooks &mdash; written in Indonesia.</td></tr>'
        '</table></td></tr></table>'
    )


@api_router.post("/notify")
async def notify_subscribers(payload: NotifyRequest, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    if not payload.subject.strip() or not payload.message.strip():
        raise HTTPException(status_code=400, detail="subject and message are required")
    subs = await db.subscribers.find().to_list(1000)
    if not subs:
        raise HTTPException(status_code=400, detail="no subscribers yet")
    site = await get_site()
    wordmark = f"{site['site_name']} · {site['owner_name']}".strip(" ·")
    html = notify_html(payload.subject.strip(), payload.message.strip(), payload.link.strip(), wordmark, site["owner_name"])
    sent, failed = 0, []
    for s in subs:
        params = {
            "from": f"{wordmark} <{SENDER_EMAIL}>",
            "to": [s["email"]],
            "subject": payload.subject.strip(),
            "html": html,
        }
        try:
            await asyncio.to_thread(resend.Emails.send, params)
            sent += 1
        except Exception as ex:
            logging.getLogger(__name__).error(f"notify failed for {s['email']}: {ex}")
            failed.append({"email": s["email"], "error": str(ex)[:200]})
    return {"sent": sent, "failed": failed, "total": len(subs)}


# ---------- Yearly archive shelf ----------
@api_router.get("/archive")
async def archive():
    notebooks = {n["id"]: n for n in await db.notebooks.find().to_list(100)}
    entries = await db.entries.find({"type": "piece", "draft": {"$ne": True}}).sort("order", 1).to_list(1000)
    years = {}
    for e in entries:
        m = re.search(r"(19|20)\d{2}", e.get("date") or "")
        if m:
            year = m.group(0)
        else:
            ca = e.get("created_at")
            year = str(ca.year) if hasattr(ca, "year") else (str(ca)[:4] if ca else "undated")
        nb = notebooks.get(e["notebook_id"])
        if not nb:
            continue
        text = (e.get("body") or "") + " " + " ".join(
            f"{c.get('title', '')} {c.get('body', '')}" for c in (e.get("chapters") or [])
        )
        words = len(text.split())
        years.setdefault(year, []).append({
            "id": e["id"],
            "slug": e.get("slug", ""),
            "title": e.get("title", ""),
            "category": e.get("category", ""),
            "date": e.get("date", ""),
            "words": words,
            "minutes": max(1, round(words / 200)),
            "notebook_slug": nb["slug"],
            "notebook_label": nb["label"],
        })
    return [{"year": y, "count": len(v), "entries": v} for y, v in sorted(years.items(), reverse=True)]


# ---------- Background music (owner uploads, plays site-wide) ----------
AUDIO_EXTS = (".mp3", ".m4a", ".ogg", ".wav", ".aac")
AUDIO_TYPES = {"mp3": "audio/mpeg", "m4a": "audio/mp4", "ogg": "audio/ogg",
               "wav": "audio/wav", "aac": "audio/aac"}


def audio_content_type(filename: str, declared: str) -> str:
    """Trust the browser only when it declares an audio type; otherwise use the extension."""
    if declared.startswith("audio/"):
        return declared
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return AUDIO_TYPES.get(ext, "audio/mpeg")


async def drop_music_file(doc):
    """Remove a GridFS audio file that is no longer referenced. Missing files are fine."""
    if not doc or not doc.get("gridfs_id"):
        return
    try:
        await music_bucket.delete(ObjectId(doc["gridfs_id"]))
    except Exception as e:
        logger.warning(f"could not delete old music file: {e}")


@api_router.get("/music")
async def get_music():
    doc = await db.settings.find_one({"_id": "music"})
    if not doc:
        return {"exists": False}
    return {"exists": True, "filename": doc.get("filename", "")}


@api_router.post("/music")
async def upload_music(file: UploadFile = File(...), x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    ct = file.content_type or ""
    name = file.filename or ""
    if not ct.startswith("audio/") and not name.lower().endswith(AUDIO_EXTS):
        raise HTTPException(status_code=400, detail="file must be an audio file (mp3, m4a, ogg, wav)")
    data = await file.read()
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="audio file too large (max 20MB)")
    content_type = audio_content_type(name, ct)
    previous = await db.settings.find_one({"_id": "music"})
    file_id = await music_bucket.upload_from_stream(name or "music", data, metadata={"content_type": content_type})
    await db.settings.update_one(
        {"_id": "music"},
        {"$set": {"gridfs_id": str(file_id), "filename": name, "content_type": content_type,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    await drop_music_file(previous)
    _music_cache.clear()
    return {"ok": True, "filename": name}


@api_router.get("/music/stream")
async def stream_music():
    doc = await db.settings.find_one({"_id": "music"})
    if not doc:
        raise HTTPException(status_code=404, detail="no music uploaded")
    file_id = doc.get("gridfs_id")
    if not file_id:
        raise HTTPException(status_code=404, detail="no music uploaded")
    if file_id not in _music_cache:
        stream = await music_bucket.open_download_stream(ObjectId(file_id))
        data = await stream.read()
        _music_cache.clear()
        _music_cache[file_id] = (data, doc.get("content_type") or "audio/mpeg")
    data, ct = _music_cache[file_id]
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=3600", "Accept-Ranges": "bytes"})


@api_router.delete("/music")
async def delete_music(x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    doc = await db.settings.find_one({"_id": "music"})
    result = await db.settings.delete_one({"_id": "music"})
    _music_cache.clear()
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="no music to delete")
    await drop_music_file(doc)
    return {"deleted": True}


# ---------- Simpang (the map of journals that cross) ----------
def find_clashes(moment_id: str, entries: List[dict], prop: str = "") -> List[dict]:
    """Where a proposition is pulled in two directions.

    Two things count. Someone turns against a proposition another person states
    — the corpus marks that with @irony — or two people state the same
    proposition and say different things. Either way the rule lives here, so the
    front end never has to know how a crossing is decided.
    """
    by_key = {}
    for e in entries:
        belongs = e.get("moment_ids") or ([e["moment_id"]] if e.get("moment_id") else [])
        if moment_id not in belongs:
            continue
        for c in e.get("claims", []):
            key = (c.get("key") or "").strip().lower()
            # An entry is a whole day and carries every proposition it touches.
            # A crossing may only speak for its own, or it would report someone
            # else's argument as its own.
            if not key or (prop and key != prop.strip().lower()):
                continue
            by_key.setdefault(key, {"claims": [], "irony": []})
            item = {
                "character_id": e["character_id"],
                "text": c.get("text", ""),
                "protected": bool(c.get("protected")),
            }
            by_key[key]["irony" if c.get("kind") == "irony" else "claims"].append(item)

    out = []
    for key, sides in by_key.items():
        claims, irony = sides["claims"], sides["irony"]
        disagree = len({i["text"].strip().lower() for i in claims}) > 1
        if irony or (len(claims) > 1 and disagree):
            out.append({"key": key, "items": claims + irony, "claims": claims, "irony": irony})
    return out


@api_router.get("/simpang")
async def get_simpang(x_studio_key: Optional[str] = Header(None)):
    """The whole map in one request — the documents are few and the page needs
    all of them at once before it can draw a single line."""
    owner = x_studio_key == STUDIO_PASSWORD
    characters = [clean(c) for c in await db.characters.find().sort("order", 1).to_list(200)]

    moments = [clean(m) for m in await db.moments.find(
        {} if owner else {"hidden": {"$ne": True}}).sort("t", 1).to_list(500)]
    visible = {m["id"] for m in moments}

    entries = [clean(e) for e in await db.journal_entries.find(
        {} if owner else {"draft": {"$ne": True}}).sort("t", 1).to_list(2000)]
    # Entries attached to a hidden junction are hidden with it; otherwise the
    # junction's contents still leak out through the entry list.
    if not owner:
        kept = []
        for e in entries:
            belongs = e.get("moment_ids") or ([e["moment_id"]] if e.get("moment_id") else [])
            if not belongs:
                kept.append(e)
                continue
            # An entry stays only if it still has somewhere visible to belong,
            # and it is trimmed to those crossings so a hidden one leaves no trace.
            shown = [m for m in belongs if m in visible]
            if shown:
                e["moment_ids"] = shown
                if e.get("moment_id") not in shown:
                    e["moment_id"] = shown[0]
                kept.append(e)
        entries = kept

        # A link is a hand-drawn pointer, so a dangling one is worse than none:
        # it offers the reader a page and then fails to open it. Anything the
        # filter above removed is dropped from every link list as well.
        alive = {e["id"] for e in entries}
        for e in entries:
            kept_links = [l for l in e.get("links", []) if l.get("entry_id") in alive]
            if len(kept_links) != len(e.get("links", [])):
                e["links"] = kept_links

    for m in moments:
        m["clashes"] = find_clashes(m["id"], entries, m.get("prop", ""))

    return {"characters": characters, "moments": moments, "entries": entries}


@api_router.post("/characters")
async def create_character(payload: CharacterCreate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    data = payload.model_dump()
    data["slug"] = data.get("slug") or slugify(payload.name)
    if data.get("order") is None:
        data["order"] = await next_order("characters")
    c = Character(**data)
    await db.characters.insert_one(c.model_dump())
    return clean(c.model_dump())


@api_router.put("/characters/{character_id}")
async def update_character(character_id: str, payload: CharacterUpdate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="nothing to update")
    result = await db.characters.update_one({"id": character_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="character not found")
    return clean(await db.characters.find_one({"id": character_id}))


@api_router.delete("/characters/{character_id}")
async def delete_character(character_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.characters.delete_one({"id": character_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="character not found")
    # Their journals go too, and their name is pulled out of every junction, so
    # the map does not draw a line for someone who no longer exists.
    await db.journal_entries.delete_many({"character_id": character_id})
    await db.moments.update_many({}, {"$pull": {"character_ids": character_id}})
    return {"deleted": True}


@api_router.post("/moments")
async def create_moment(payload: MomentCreate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    m = Moment(**payload.model_dump())
    await db.moments.insert_one(m.model_dump())
    return clean(m.model_dump())


@api_router.put("/moments/{moment_id}")
async def update_moment(moment_id: str, payload: MomentUpdate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="nothing to update")
    result = await db.moments.update_one({"id": moment_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="moment not found")
    return clean(await db.moments.find_one({"id": moment_id}))


@api_router.delete("/moments/{moment_id}")
async def delete_moment(moment_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.moments.delete_one({"id": moment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="moment not found")
    # The entries survive and are only detached — finished writing should not
    # disappear because of one click on the junction it happened to sit in.
    await db.journal_entries.update_many({"moment_id": moment_id}, {"$set": {"moment_id": None}})
    return {"deleted": True}


@api_router.post("/journal-entries")
async def create_journal_entry(payload: JournalEntryCreate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    if not await db.characters.find_one({"id": payload.character_id}):
        raise HTTPException(status_code=404, detail="character not found")
    e = JournalEntry(**payload.model_dump())
    await db.journal_entries.insert_one(e.model_dump())
    return clean(e.model_dump())


@api_router.put("/journal-entries/{entry_id}")
async def update_journal_entry(entry_id: str, payload: JournalEntryUpdate, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="nothing to update")
    result = await db.journal_entries.update_one({"id": entry_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="journal entry not found")
    return clean(await db.journal_entries.find_one({"id": entry_id}))


@api_router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(entry_id: str, x_studio_key: Optional[str] = Header(None)):
    require_studio_key(x_studio_key)
    result = await db.journal_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="journal entry not found")
    return {"deleted": True}


@api_router.post("/simpang/sample")
async def load_simpang_sample(x_studio_key: Optional[str] = Header(None)):
    """Sample content, loaded by hand from Studio. Deliberately NOT part of the
    boot-time seed: this is fiction the owner did not write, and it must never
    appear in a production database on its own."""
    require_studio_key(x_studio_key)
    if await db.characters.count_documents({}) > 0:
        raise HTTPException(status_code=409, detail="simpang already has characters")

    ids = {}
    for i, c in enumerate(SAMPLE_CHARACTERS):
        ch = Character(order=i, slug=slugify(c["name"]), **c)
        ids[c["name"].lower()] = ch.id
        await db.characters.insert_one(ch.model_dump())

    for m in SAMPLE_MOMENTS:
        mo = Moment(
            label=m["label"], place=m["place"], t=m["t"], date_label=m["date_label"],
            note=m.get("note", ""), above=m.get("above", True),
            character_ids=[ids[n] for n in m["cast"]],
        )
        await db.moments.insert_one(mo.model_dump())
        for who, e in m["entries"].items():
            je = JournalEntry(
                character_id=ids[who], moment_id=mo.id, t=m["t"],
                date_label=m["date_label"], place=m["place"],
                title=m["label"], body=e["body"],
                claims=[Claim(**c) for c in e.get("claims", [])],
            )
            await db.journal_entries.insert_one(je.model_dump())

    return {"characters": len(SAMPLE_CHARACTERS), "moments": len(SAMPLE_MOMENTS)}


@api_router.delete("/simpang/all")
async def clear_simpang(x_studio_key: Optional[str] = Header(None)):
    """Empty Simpang completely. Notebooks and entries are left alone."""
    require_studio_key(x_studio_key)
    c = await db.characters.delete_many({})
    m = await db.moments.delete_many({})
    e = await db.journal_entries.delete_many({})
    return {"characters": c.deleted_count, "moments": m.deleted_count, "entries": e.deleted_count}



app.include_router(api_router)

# Comma-separated origins allowed to call this API. Defaults to the local dev
# server; in production set it to the deployed frontend's origin.
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
_allow_any_origin = CORS_ORIGINS == ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    # A wildcard origin cannot be combined with credentials — browsers reject the
    # pair outright. This API authenticates with the X-Studio-Key header, never
    # with cookies, so it does not need them.
    allow_credentials=not _allow_any_origin,
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
        nb = Notebook(slug=nb_data["slug"], label=nb_data["label"], cover_title=nb_data.get("cover_title", "COMMONPLACE BOOK"),
                      subtitle=nb_data["subtitle"], variant=nb_data["variant"], order=i)
        await db.notebooks.insert_one(nb.model_dump())
        for j, e in enumerate(nb_data["entries"]):
            entry = Entry(notebook_id=nb.id, order=j, slug=await unique_entry_slug(e.get("title", "")), **e)
            await db.entries.insert_one(entry.model_dump())
    logger.info("Seed complete.")


@app.on_event("startup")
async def backfill_entry_slugs():
    """Entries written before slugs existed still need an address. Runs on every
    boot and does nothing once they all have one."""
    missing = await db.entries.find({"$or": [{"slug": {"$exists": False}}, {"slug": ""}]}).to_list(None)
    if not missing:
        return
    for e in missing:
        slug = await unique_entry_slug(e.get("title", ""), "", e["id"])
        await db.entries.update_one({"id": e["id"]}, {"$set": {"slug": slug}})
    logger.info(f"Assigned slugs to {len(missing)} entries")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
