import os
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
KEY = "koda3am"
OWNER_EMAIL = "witnessday29@gmail.com"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def created_sub_ids():
    return []


@pytest.fixture(scope="session", autouse=True)
def cleanup(client, created_sub_ids):
    yield
    for sid in created_sub_ids:
        client.delete(f"{API}/subscribers/{sid}", headers={"X-Studio-Key": KEY})


# ---------- Subscribers ----------
class TestSubscribers:
    def test_subscribe_valid(self, client, created_sub_ids):
        email = f"test_qa_{uuid.uuid4().hex[:8]}@example.com"
        r = client.post(f"{API}/subscribers", json={"email": email, "name": "TEST_QA"})
        assert r.status_code == 200, r.text
        assert r.json() == {"ok": True, "already": False}

        # verify persistence via studio list
        lr = client.get(f"{API}/subscribers", headers={"X-Studio-Key": KEY})
        assert lr.status_code == 200
        subs = lr.json()
        match = [s for s in subs if s["email"] == email]
        assert len(match) == 1
        assert "_id" not in match[0]
        assert match[0]["name"] == "TEST_QA"
        created_sub_ids.append(match[0]["id"])

        # duplicate
        r2 = client.post(f"{API}/subscribers", json={"email": email.upper(), "name": "x"})
        assert r2.status_code == 200
        assert r2.json() == {"ok": True, "already": True}

    @pytest.mark.parametrize("bad", ["notanemail", "a@b", "", "  ", "foo@bar."])
    def test_subscribe_invalid(self, client, bad):
        r = client.post(f"{API}/subscribers", json={"email": bad})
        assert r.status_code in (400, 422), f"{bad} -> {r.status_code} {r.text[:200]}"

    def test_list_requires_key(self, client):
        r = client.get(f"{API}/subscribers")
        assert r.status_code == 401
        r2 = client.get(f"{API}/subscribers", headers={"X-Studio-Key": "wrong"})
        assert r2.status_code == 401

    def test_owner_subscriber_present(self, client):
        r = client.get(f"{API}/subscribers", headers={"X-Studio-Key": KEY})
        assert r.status_code == 200
        assert OWNER_EMAIL in [s["email"] for s in r.json()]

    def test_delete_requires_key_and_404(self, client):
        r = client.delete(f"{API}/subscribers/{uuid.uuid4()}")
        assert r.status_code == 401
        r2 = client.delete(f"{API}/subscribers/{uuid.uuid4()}", headers={"X-Studio-Key": KEY})
        assert r2.status_code == 404

    def test_delete_removes(self, client):
        email = f"test_qa_del_{uuid.uuid4().hex[:8]}@example.com"
        client.post(f"{API}/subscribers", json={"email": email})
        subs = client.get(f"{API}/subscribers", headers={"X-Studio-Key": KEY}).json()
        sid = [s["id"] for s in subs if s["email"] == email][0]
        d = client.delete(f"{API}/subscribers/{sid}", headers={"X-Studio-Key": KEY})
        assert d.status_code == 200 and d.json().get("deleted") is True
        subs2 = client.get(f"{API}/subscribers", headers={"X-Studio-Key": KEY}).json()
        assert email not in [s["email"] for s in subs2]


# ---------- Notify (Resend live - max one real send) ----------
class TestNotify:
    def test_notify_requires_key(self, client):
        r = client.post(f"{API}/notify", json={"subject": "x", "message": "y"})
        assert r.status_code == 401

    def test_notify_validation(self, client):
        h = {"X-Studio-Key": KEY}
        assert client.post(f"{API}/notify", json={"subject": "  ", "message": "y"}, headers=h).status_code == 400
        assert client.post(f"{API}/notify", json={"subject": "x", "message": "   "}, headers=h).status_code == 400

    def test_notify_send_once(self, client):
        r = client.post(
            f"{API}/notify",
            json={"subject": "QA test", "message": "QA test message - please ignore.", "link": ""},
            headers={"X-Studio-Key": KEY},
            timeout=120,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(["sent", "failed", "total"]).issubset(data.keys())
        assert data["total"] >= 1
        assert data["sent"] >= 1, f"no email sent: {data}"


# ---------- Archive ----------
class TestArchive:
    def test_archive_structure(self, client):
        r = client.get(f"{API}/archive")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        years = [y["year"] for y in data]
        assert years == sorted(years, reverse=True)
        assert "2025" in years and "2024" in years
        by_year = {y["year"]: y for y in data}
        assert by_year["2025"]["count"] == 7, by_year["2025"]["count"]
        assert by_year["2024"]["count"] == 1
        for y in data:
            assert y["count"] == len(y["entries"])
            for e in y["entries"]:
                for k in ["id", "title", "category", "words", "minutes", "notebook_slug"]:
                    assert k in e, f"missing {k}"
                assert isinstance(e["words"], int) and e["words"] > 0
                assert e["minutes"] >= 1

    def test_archive_excludes_drafts(self, client):
        entries = client.get(f"{API}/entries", headers={"X-Studio-Key": KEY})
        if entries.status_code != 200:
            pytest.skip("no /entries listing")
        arch_ids = {e["id"] for y in client.get(f"{API}/archive").json() for e in y["entries"]}
        drafts = [e["id"] for e in entries.json() if e.get("draft")]
        for d in drafts:
            assert d not in arch_ids


# ---------- Now Writing (read-only) ----------
class TestNowWriting:
    def test_now_writing(self, client):
        r = client.get(f"{API}/now-writing")
        assert r.status_code == 200
        d = r.json()
        assert d["active"] is True
        assert d["title"] == "Hujan di Simpang Jalan"
        assert d["goal_words"] == 40000
        assert d["current_words"] == 12480
        assert "_id" not in d


# ---------- Light regression ----------
class TestRegression:
    def test_notebooks(self, client):
        r = client.get(f"{API}/notebooks")
        assert r.status_code == 200
        slugs = [n["slug"] for n in r.json()]
        for s in ["about", "writings", "kind-words"]:
            assert s in slugs

    def test_guestbook_public(self, client):
        r = client.get(f"{API}/guestbook")
        assert r.status_code == 200
        assert all(n.get("approved") for n in r.json())

    def test_guestbook_submit_and_moderate(self, client):
        r = client.post(f"{API}/guestbook", json={"name": "TEST_QA", "message": "TEST_QA hello wall", "color": "lemon"})
        assert r.status_code == 200
        note = r.json()
        assert note["approved"] is False
        public = client.get(f"{API}/guestbook").json()
        assert note["id"] not in [n["id"] for n in public]
        d = client.delete(f"{API}/guestbook/{note['id']}", headers={"X-Studio-Key": KEY})
        assert d.status_code == 200

    def test_guestbook_short_message(self, client):
        r = client.post(f"{API}/guestbook", json={"name": "a", "message": "hi"})
        assert r.status_code == 400

    def test_ideas_requires_key(self, client):
        assert client.get(f"{API}/ideas").status_code in (200, 401)
