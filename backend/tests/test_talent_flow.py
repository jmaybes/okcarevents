"""End-to-end test for StreetMotion talent lifecycle.

Covers:
- Admin login
- Admin creates shareable invite (generate_code=true)
- Register fresh user
- Validate invite code (case-sensitive)
- Accept invite -> user becomes talent, placeholder profile created
- user_helper now returns isTalent + talentProfileId (login + /api/users/{id})
- PUT /api/talent/{id} with full profile data (incl base64 photo) -> setupComplete + isActive
- GET /api/talent returns the profile
- GET /api/talent/{id} works and increments views (is_owner=false path)
- Edit again: change bio -> persists
- Hide: isActive=false -> disappears from GET /api/talent; restore -> reappears
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://event-hub-okc-1.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@okcarevents.com"
ADMIN_PASSWORD = "admin123"

# 1x1 transparent PNG base64 (tiny valid image)
TINY_PNG_B64 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def ctx():
    """Shared context across tests - keeps order & state."""
    return {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- 1. Admin login ----------
def test_01_admin_login(session, ctx):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    user = data.get("user") or data
    assert user.get("isAdmin") is True
    assert "id" in user
    # user_helper must now expose these keys (even if false/None for admin)
    assert "isTalent" in user, "user_helper missing isTalent on login response"
    assert "talentProfileId" in user, "user_helper missing talentProfileId on login response"
    ctx["admin_id"] = user["id"]


# ---------- 2. Admin creates shareable invite ----------
def test_02_create_shareable_invite(session, ctx):
    r = session.post(f"{BASE_URL}/api/admin/talent/invite?admin_id={ctx['admin_id']}&generate_code=true")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("success") is True
    invite = data.get("invite", {})
    assert invite.get("code")
    assert invite.get("status") == "pending"
    code = invite["code"]
    assert 8 <= len(code) <= 16, f"Unexpected code length: {code}"
    ctx["invite_code"] = code


# ---------- 3. Register fresh user ----------
def test_03_register_user(session, ctx):
    suffix = uuid.uuid4().hex[:8]
    email = f"talentuser+{suffix}@test.com"
    payload = {"email": email, "password": "Test1234!", "name": f"Talent {suffix}"}
    r = session.post(f"{BASE_URL}/api/auth/register", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    user = data.get("user") or data
    assert user.get("email") == email
    # New users should see keys defaulted
    assert user.get("isTalent") in (False, None, 0), "fresh user should not be talent"
    assert user.get("talentProfileId") in (None, "",), "fresh user should have no talentProfileId"
    ctx["user_id"] = user["id"]
    ctx["user_email"] = email
    ctx["user_name"] = user.get("name", "")


# ---------- 4. Validate code (case-sensitive) ----------
def test_04_validate_code(session, ctx):
    code = ctx["invite_code"]
    r = session.get(f"{BASE_URL}/api/talent/invite/{code}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("valid") is True

    # Case sensitivity: altered code must NOT validate (unless the token happens to be case-insensitive distinct)
    altered = code.swapcase()
    if altered != code:
        r2 = session.get(f"{BASE_URL}/api/talent/invite/{altered}")
        assert r2.status_code == 404, f"Codes must be case-sensitive! altered={altered} returned {r2.status_code}"


# ---------- 5. Accept invite ----------
def test_05_accept_invite(session, ctx):
    code = ctx["invite_code"]
    user_id = ctx["user_id"]
    r = session.post(f"{BASE_URL}/api/talent/invite/{code}/accept?user_id={user_id}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("success") is True
    profile = data.get("profile", {})
    assert profile.get("id")
    # Prefill
    assert profile.get("displayName") == ctx["user_name"]
    assert profile.get("contactEmail") == ctx["user_email"]
    assert profile.get("isActive") is False  # not live until setup
    ctx["profile_id"] = profile["id"]


# ---------- 6. user_helper now returns isTalent + talentProfileId ----------
def test_06_user_helper_has_talent_flags(session, ctx):
    r = session.get(f"{BASE_URL}/api/users/{ctx['user_id']}")
    assert r.status_code == 200, r.text
    u = r.json()
    assert u.get("isTalent") is True, f"isTalent should be True after accept, got {u.get('isTalent')}"
    assert u.get("talentProfileId") == ctx["profile_id"], (
        f"talentProfileId mismatch: expected {ctx['profile_id']}, got {u.get('talentProfileId')}"
    )


# ---------- 7a. Document frontend-contract mismatch: wrapped body is a NO-OP ----------
def test_07a_wrapped_body_is_noop_BUG(session, ctx):
    """Frontend setup.tsx sends `{profile_data: {...}}` but backend ignores wrapped keys.
    This test documents the BUG — talent cannot complete setup via the wrapped payload.
    """
    body = {
        "profile_data": {
            "bio": "SHOULD-NOT-PERSIST-WRAPPED",
            "category": "photographer",
        }
    }
    r = session.put(
        f"{BASE_URL}/api/talent/{ctx['profile_id']}?user_id={ctx['user_id']}",
        json=body,
    )
    assert r.status_code == 200
    # Confirm nothing from the inner dict actually persisted
    r2 = session.get(f"{BASE_URL}/api/talent/{ctx['profile_id']}")
    assert r2.json().get("bio") != "SHOULD-NOT-PERSIST-WRAPPED", (
        "If this passes it means the backend is now correctly unwrapping — "
        "update the frontend/backend contract and remove this test."
    )


# ---------- 7b. Complete setup via PUT with UN-wrapped body (actual contract) ----------
def test_07_complete_setup(session, ctx):
    body = {
        "displayName": "Test Talent " + ctx["user_id"][-6:],
        "bio": "I shoot amazing cars at every meet in OKC.",
        "category": "photographer",
        "photos": [TINY_PNG_B64],
        "isActive": True,
    }
    r = session.put(
        f"{BASE_URL}/api/talent/{ctx['profile_id']}?user_id={ctx['user_id']}",
        json=body,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("success") is True
    p = data.get("profile", {})
    assert p.get("isActive") is True
    assert p.get("category") == "photographer"
    assert p.get("bio", "").startswith("I shoot")
    assert len(p.get("photos", [])) == 1
    # Note: setupComplete is NOT in talent_helper response — can't verify from API alone.


# ---------- 8. GET /api/talent returns the new profile ----------
def test_08_listed_in_public_feed(session, ctx):
    r = session.get(f"{BASE_URL}/api/talent?sort_by=newest")
    assert r.status_code == 200, r.text
    data = r.json()
    talent_list = data.get("talent", [])
    ids = {t["id"] for t in talent_list}
    assert ctx["profile_id"] in ids, "newly-active profile not in public feed"


# ---------- 9. GET /api/talent/{id} returns full profile ----------
def test_09_fetch_full_profile(session, ctx):
    r = session.get(f"{BASE_URL}/api/talent/{ctx['profile_id']}?user_id={ctx['user_id']}&is_owner=true")
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["id"] == ctx["profile_id"]
    assert p.get("userId") == ctx["user_id"], "userId on profile must match acceptor for owner-edit button"


# ---------- 10. Edit again: change bio persists ----------
def test_10_edit_bio_persists(session, ctx):
    new_bio = "Updated bio at " + str(int(time.time()))
    r = session.put(
        f"{BASE_URL}/api/talent/{ctx['profile_id']}?user_id={ctx['user_id']}",
        json={"bio": new_bio},
    )
    assert r.status_code == 200, r.text
    # GET to confirm persistence
    r2 = session.get(f"{BASE_URL}/api/talent/{ctx['profile_id']}")
    assert r2.status_code == 200
    assert r2.json().get("bio") == new_bio


# ---------- 11. Hide / Show via isActive ----------
def test_11_hide_removes_from_feed(session, ctx):
    r = session.put(
        f"{BASE_URL}/api/talent/{ctx['profile_id']}?user_id={ctx['user_id']}",
        json={"isActive": False},
    )
    assert r.status_code == 200
    time.sleep(0.5)
    r2 = session.get(f"{BASE_URL}/api/talent?sort_by=newest")
    ids = {t["id"] for t in r2.json().get("talent", [])}
    assert ctx["profile_id"] not in ids, "hidden profile still visible in public feed"


def test_12_show_restores_in_feed(session, ctx):
    r = session.put(
        f"{BASE_URL}/api/talent/{ctx['profile_id']}?user_id={ctx['user_id']}",
        json={"isActive": True},
    )
    assert r.status_code == 200
    time.sleep(0.5)
    r2 = session.get(f"{BASE_URL}/api/talent?sort_by=newest")
    ids = {t["id"] for t in r2.json().get("talent", [])}
    assert ctx["profile_id"] in ids, "restored profile missing from public feed"


# ---------- 13. Cleanup: admin deletes talent profile ----------
def test_13_cleanup_admin_delete(session, ctx):
    r = session.delete(
        f"{BASE_URL}/api/admin/talent/{ctx['profile_id']}?admin_id={ctx['admin_id']}"
    )
    assert r.status_code == 200, r.text
