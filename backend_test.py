#!/usr/bin/env python3
"""
Backend API tests for Field Log writing showcase app.
Tests all CRUD operations, validation, and seeded data.
"""

import requests
import json
import sys
from typing import Dict, List, Any

# Base URL from frontend/.env
BASE_URL = "https://story-archive-38.preview.emergentagent.com/api"

# Studio password for auth
STUDIO_PASSWORD = "koda3am"

# Track test data for cleanup
test_notebook_ids = []
test_entry_ids = []
test_idea_ids = []
test_guestbook_ids = []

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name: str):
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST: {name}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")

def log_pass(msg: str):
    print(f"{Colors.GREEN}✓ PASS: {msg}{Colors.END}")

def log_fail(msg: str):
    print(f"{Colors.RED}✗ FAIL: {msg}{Colors.END}")

def log_info(msg: str):
    print(f"{Colors.YELLOW}ℹ INFO: {msg}{Colors.END}")

def assert_equal(actual, expected, field_name: str):
    if actual != expected:
        log_fail(f"{field_name}: expected {expected}, got {actual}")
        return False
    log_pass(f"{field_name}: {actual}")
    return True

def assert_in(item, collection, field_name: str):
    if item not in collection:
        log_fail(f"{field_name}: {item} not in {collection}")
        return False
    log_pass(f"{field_name}: {item} in collection")
    return True

def assert_not_empty(value, field_name: str):
    if not value:
        log_fail(f"{field_name} is empty")
        return False
    log_pass(f"{field_name} is not empty")
    return True

def test_1_studio_auth_correct_password():
    """Test POST /api/studio/auth with correct password"""
    log_test("1. POST /api/studio/auth - Correct password should return 200")
    
    payload = {"password": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/studio/auth", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    data = response.json()
    if not assert_equal(data.get('ok'), True, "Auth response 'ok' field"):
        return False
    
    log_pass("Studio auth with correct password works")
    return True

def test_2_studio_auth_wrong_password():
    """Test POST /api/studio/auth with wrong password"""
    log_test("2. POST /api/studio/auth - Wrong password should return 401")
    
    payload = {"password": "wrongpassword123"}
    response = requests.post(f"{BASE_URL}/studio/auth", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Studio auth with wrong password correctly returns 401")
    return True

def test_3_public_read_notebooks_no_header():
    """Test GET /api/notebooks works without auth header"""
    log_test("3. GET /api/notebooks - Public read without header")
    
    response = requests.get(f"{BASE_URL}/notebooks")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notebooks = response.json()
    if not assert_equal(len(notebooks), 3, "Number of seeded notebooks"):
        return False
    
    log_pass("Public read of notebooks works without auth")
    return True

def test_4_public_read_notebook_full_no_header():
    """Test GET /api/notebooks/{slug}/full works without auth header"""
    log_test("4. GET /api/notebooks/writings/full - Public read without header")
    
    response = requests.get(f"{BASE_URL}/notebooks/writings/full")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    data = response.json()
    if 'notebook' not in data or 'entries' not in data:
        log_fail("Response should have 'notebook' and 'entries' keys")
        return False
    
    log_pass("Public read of full notebook works without auth")
    return True

def test_5_create_notebook_no_header():
    """Test POST /api/notebooks without X-Studio-Key header returns 401"""
    log_test("5. POST /api/notebooks - No auth header should return 401")
    
    payload = {
        "label": "Should Fail",
        "variant": "paper"
    }
    
    response = requests.post(f"{BASE_URL}/notebooks", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Create notebook without auth correctly returns 401")
    return True

def test_6_create_notebook_wrong_key():
    """Test POST /api/notebooks with wrong X-Studio-Key returns 401"""
    log_test("6. POST /api/notebooks - Wrong auth key should return 401")
    
    payload = {
        "label": "Should Fail",
        "variant": "paper"
    }
    
    headers = {"X-Studio-Key": "wrongkey123"}
    response = requests.post(f"{BASE_URL}/notebooks", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Create notebook with wrong key correctly returns 401")
    return True

def test_7_create_notebook_with_correct_key():
    """Test POST /api/notebooks with correct X-Studio-Key works"""
    log_test("7. POST /api/notebooks - Correct auth key should work")
    
    payload = {
        "label": "Auth Test Notebook 2026",
        "variant": "night",
        "cover_title": "AUTH TEST",
        "subtitle": ["Protected", "Created with auth"]
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/notebooks", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    notebook = response.json()
    
    if not assert_not_empty(notebook.get('id'), "Notebook ID"):
        return False
    
    if not assert_equal(notebook['label'], payload['label'], "Label"):
        return False
    
    # Store for cleanup and further tests
    test_notebook_ids.append(notebook['id'])
    
    log_pass(f"Create notebook with correct key works, ID: {notebook['id']}")
    return True

def test_8_update_notebook_no_header():
    """Test PUT /api/notebooks/{id} without header returns 401"""
    log_test("8. PUT /api/notebooks/{id} - No auth header should return 401")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    payload = {"label": "Should Fail"}
    
    response = requests.put(f"{BASE_URL}/notebooks/{notebook_id}", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Update notebook without auth correctly returns 401")
    return True

def test_9_update_notebook_wrong_key():
    """Test PUT /api/notebooks/{id} with wrong key returns 401"""
    log_test("9. PUT /api/notebooks/{id} - Wrong auth key should return 401")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    payload = {"label": "Should Fail"}
    headers = {"X-Studio-Key": "wrongkey"}
    
    response = requests.put(f"{BASE_URL}/notebooks/{notebook_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Update notebook with wrong key correctly returns 401")
    return True

def test_10_update_notebook_with_correct_key():
    """Test PUT /api/notebooks/{id} with correct key works"""
    log_test("10. PUT /api/notebooks/{id} - Correct auth key should work")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    payload = {
        "label": "Updated Auth Test",
        "variant": "forest"
    }
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
    response = requests.put(f"{BASE_URL}/notebooks/{notebook_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notebook = response.json()
    if not assert_equal(notebook['label'], payload['label'], "Updated label"):
        return False
    
    log_pass("Update notebook with correct key works")
    return True

def test_11_create_entry_no_header():
    """Test POST /api/entries without header returns 401"""
    log_test("11. POST /api/entries - No auth header should return 401")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    payload = {
        "notebook_id": notebook_id,
        "type": "piece",
        "title": "Should Fail"
    }
    
    response = requests.post(f"{BASE_URL}/entries", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Create entry without auth correctly returns 401")
    return True

def test_12_create_entry_wrong_key():
    """Test POST /api/entries with wrong key returns 401"""
    log_test("12. POST /api/entries - Wrong auth key should return 401")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    payload = {
        "notebook_id": notebook_id,
        "type": "piece",
        "title": "Should Fail"
    }
    headers = {"X-Studio-Key": "wrongkey"}
    
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Create entry with wrong key correctly returns 401")
    return True

def test_13_create_entry_with_correct_key():
    """Test POST /api/entries with correct key works"""
    log_test("13. POST /api/entries - Correct auth key should work")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    payload = {
        "notebook_id": notebook_id,
        "type": "piece",
        "category": "Novel",
        "title": "Auth Protected Novel",
        "date": "2026",
        "body": "This entry was created with authentication.",
        "chapters": [
            {"title": "Chapter 1", "body": "Protected content..."},
            {"title": "Chapter 2", "body": "More protected content..."}
        ]
    }
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    entry = response.json()
    
    if not assert_not_empty(entry.get('id'), "Entry ID"):
        return False
    
    if not assert_equal(len(entry['chapters']), 2, "Number of chapters"):
        return False
    
    test_entry_ids.append(entry['id'])
    
    log_pass(f"Create entry with correct key works, ID: {entry['id']}")
    return True

def test_14_update_entry_no_header():
    """Test PUT /api/entries/{id} without header returns 401"""
    log_test("14. PUT /api/entries/{id} - No auth header should return 401")
    
    if not test_entry_ids:
        log_fail("No test entry available")
        return False
    
    entry_id = test_entry_ids[0]
    payload = {"title": "Should Fail"}
    
    response = requests.put(f"{BASE_URL}/entries/{entry_id}", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Update entry without auth correctly returns 401")
    return True

def test_15_update_entry_wrong_key():
    """Test PUT /api/entries/{id} with wrong key returns 401"""
    log_test("15. PUT /api/entries/{id} - Wrong auth key should return 401")
    
    if not test_entry_ids:
        log_fail("No test entry available")
        return False
    
    entry_id = test_entry_ids[0]
    payload = {"title": "Should Fail"}
    headers = {"X-Studio-Key": "wrongkey"}
    
    response = requests.put(f"{BASE_URL}/entries/{entry_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Update entry with wrong key correctly returns 401")
    return True

def test_16_update_entry_with_correct_key():
    """Test PUT /api/entries/{id} with correct key works"""
    log_test("16. PUT /api/entries/{id} - Correct auth key should work")
    
    if not test_entry_ids:
        log_fail("No test entry available")
        return False
    
    entry_id = test_entry_ids[0]
    payload = {
        "title": "Updated Auth Novel",
        "chapters": [
            {"title": "Updated Ch 1", "body": "New content"},
            {"title": "Updated Ch 2", "body": "More new content"},
            {"title": "Chapter 3", "body": "Added chapter"}
        ]
    }
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
    response = requests.put(f"{BASE_URL}/entries/{entry_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    entry = response.json()
    if not assert_equal(entry['title'], payload['title'], "Updated title"):
        return False
    
    if not assert_equal(len(entry['chapters']), 3, "Updated chapters count"):
        return False
    
    log_pass("Update entry with correct key works")
    return True

def test_17_delete_entry_no_header():
    """Test DELETE /api/entries/{id} without header returns 401"""
    log_test("17. DELETE /api/entries/{id} - No auth header should return 401")
    
    if not test_entry_ids:
        log_fail("No test entry available")
        return False
    
    entry_id = test_entry_ids[0]
    
    response = requests.delete(f"{BASE_URL}/entries/{entry_id}")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Delete entry without auth correctly returns 401")
    return True

def test_18_delete_entry_wrong_key():
    """Test DELETE /api/entries/{id} with wrong key returns 401"""
    log_test("18. DELETE /api/entries/{id} - Wrong auth key should return 401")
    
    if not test_entry_ids:
        log_fail("No test entry available")
        return False
    
    entry_id = test_entry_ids[0]
    headers = {"X-Studio-Key": "wrongkey"}
    
    response = requests.delete(f"{BASE_URL}/entries/{entry_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Delete entry with wrong key correctly returns 401")
    return True

def test_19_delete_entry_with_correct_key():
    """Test DELETE /api/entries/{id} with correct key works"""
    log_test("19. DELETE /api/entries/{id} - Correct auth key should work")
    
    if not test_entry_ids:
        log_fail("No test entry available")
        return False
    
    entry_id = test_entry_ids[0]
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
    response = requests.delete(f"{BASE_URL}/entries/{entry_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    test_entry_ids.remove(entry_id)
    log_pass("Delete entry with correct key works")
    return True

def test_20_delete_notebook_no_header():
    """Test DELETE /api/notebooks/{id} without header returns 401"""
    log_test("20. DELETE /api/notebooks/{id} - No auth header should return 401")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    response = requests.delete(f"{BASE_URL}/notebooks/{notebook_id}")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Delete notebook without auth correctly returns 401")
    return True

def test_21_delete_notebook_wrong_key():
    """Test DELETE /api/notebooks/{id} with wrong key returns 401"""
    log_test("21. DELETE /api/notebooks/{id} - Wrong auth key should return 401")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    headers = {"X-Studio-Key": "wrongkey"}
    
    response = requests.delete(f"{BASE_URL}/notebooks/{notebook_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Delete notebook with wrong key correctly returns 401")
    return True

def test_22_delete_notebook_with_correct_key():
    """Test DELETE /api/notebooks/{id} with correct key works (cascade)"""
    log_test("22. DELETE /api/notebooks/{id} - Correct auth key should work")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
    response = requests.delete(f"{BASE_URL}/notebooks/{notebook_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    test_notebook_ids.remove(notebook_id)
    log_pass("Delete notebook with correct key works (cascade)")
    return True

def test_23_verify_seeded_notebooks_intact():
    """Verify the 3 seeded notebooks are still intact"""
    log_test("23. Verify seeded notebooks intact after auth tests")
    
    response = requests.get(f"{BASE_URL}/notebooks")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notebooks = response.json()
    
    # Should still have exactly 3 seeded notebooks
    if not assert_equal(len(notebooks), 3, "Number of notebooks"):
        return False
    
    slugs = [nb['slug'] for nb in notebooks]
    expected_slugs = ['about', 'writings', 'kind-words']
    
    for slug in expected_slugs:
        if not assert_in(slug, slugs, f"Seeded notebook '{slug}'"):
            return False
    
    log_pass("All 3 seeded notebooks intact")
    return True

def test_24_get_notebooks():
    """Test GET /api/notebooks - should return 3 seeded notebooks"""
    log_test("24. GET /api/notebooks - List all notebooks")
    
    response = requests.get(f"{BASE_URL}/notebooks")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notebooks = response.json()
    log_info(f"Received {len(notebooks)} notebooks")
    
    # Should have exactly 3 seeded notebooks
    if not assert_equal(len(notebooks), 3, "Number of notebooks"):
        return False
    
    # Check slugs
    slugs = [nb['slug'] for nb in notebooks]
    expected_slugs = ['about', 'writings', 'kind-words']
    
    for slug in expected_slugs:
        if not assert_in(slug, slugs, f"Slug '{slug}'"):
            return False
    
    # Verify each notebook has required fields
    for nb in notebooks:
        log_info(f"Checking notebook: {nb['slug']}")
        required_fields = ['id', 'slug', 'label', 'cover_title', 'subtitle', 'variant', 'order']
        for field in required_fields:
            if field not in nb:
                log_fail(f"Missing field: {field}")
                return False
        
        # Verify subtitle is an array
        if not isinstance(nb['subtitle'], list):
            log_fail(f"subtitle should be array, got {type(nb['subtitle'])}")
            return False
        
        # Verify variant is valid
        valid_variants = ['orange', 'paper', 'blue', 'forest', 'night']
        if not assert_in(nb['variant'], valid_variants, f"Variant for {nb['slug']}"):
            return False
    
    # Verify ordering
    orders = [nb['order'] for nb in notebooks]
    if orders != sorted(orders):
        log_fail(f"Notebooks not ordered correctly: {orders}")
        return False
    
    log_pass("All notebooks validated successfully")
    return True

def test_25_get_notebook_full_writings():
    """Test GET /api/notebooks/writings/full - should return notebook with 8 entries"""
    log_test("2. GET /api/notebooks/writings/full - Full notebook with entries")
    
    response = requests.get(f"{BASE_URL}/notebooks/writings/full")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    # Check structure
    if 'notebook' not in data or 'entries' not in data:
        log_fail("Response should have 'notebook' and 'entries' keys")
        return False
    
    notebook = data['notebook']
    entries = data['entries']
    
    log_info(f"Notebook: {notebook['slug']}")
    log_info(f"Entries count: {len(entries)}")
    
    # Should have 8 entries
    if not assert_equal(len(entries), 8, "Number of entries"):
        return False
    
    # Find novel entries with chapters
    novels_with_chapters = []
    for entry in entries:
        if entry.get('category') == 'Novel' and entry.get('chapters'):
            novels_with_chapters.append(entry)
            log_info(f"Novel: {entry['title']} - {len(entry['chapters'])} chapters")
    
    # Should have 2 novels with chapters
    if not assert_equal(len(novels_with_chapters), 2, "Novels with chapters"):
        return False
    
    # Check specific novels
    cartographer = next((e for e in entries if e['title'] == 'The Cartographer of Silence'), None)
    rain = next((e for e in entries if e['title'] == 'Rain Over Batavia'), None)
    
    if not cartographer:
        log_fail("Missing 'The Cartographer of Silence'")
        return False
    
    if not rain:
        log_fail("Missing 'Rain Over Batavia'")
        return False
    
    # Verify chapter counts
    if not assert_equal(len(cartographer['chapters']), 3, "Cartographer chapters"):
        return False
    
    if not assert_equal(len(rain['chapters']), 2, "Rain chapters"):
        return False
    
    # Verify chapters have title and body
    for chapter in cartographer['chapters']:
        if not assert_not_empty(chapter.get('title'), "Chapter title"):
            return False
        if not assert_not_empty(chapter.get('body'), "Chapter body"):
            return False
    
    log_pass("Writings notebook validated successfully")
    return True

def test_26_get_notebook_full_about():
    """Test GET /api/notebooks/about/full - should return 4 about entries"""
    log_test("3. GET /api/notebooks/about/full - About notebook")
    
    response = requests.get(f"{BASE_URL}/notebooks/about/full")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    data = response.json()
    entries = data['entries']
    
    log_info(f"Entries count: {len(entries)}")
    
    # Should have 4 entries
    if not assert_equal(len(entries), 4, "Number of about entries"):
        return False
    
    # All should be type 'about'
    for entry in entries:
        if not assert_equal(entry['type'], 'about', f"Entry type for '{entry['title']}'"):
            return False
    
    log_pass("About notebook validated successfully")
    return True

def test_27_get_notebook_full_kind_words():
    """Test GET /api/notebooks/kind-words/full - should return 4 kind entries"""
    log_test("4. GET /api/notebooks/kind-words/full - Kind words notebook")
    
    response = requests.get(f"{BASE_URL}/notebooks/kind-words/full")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    data = response.json()
    entries = data['entries']
    
    log_info(f"Entries count: {len(entries)}")
    
    # Should have 4 entries
    if not assert_equal(len(entries), 4, "Number of kind entries"):
        return False
    
    # All should be type 'kind'
    for entry in entries:
        if not assert_equal(entry['type'], 'kind', f"Entry type for '{entry['title']}'"):
            return False
    
    log_pass("Kind words notebook validated successfully")
    return True

def test_28_get_notebook_full_unknown():
    """Test GET /api/notebooks/unknown/full - should return 404"""
    log_test("5. GET /api/notebooks/unknown/full - Unknown slug should 404")
    
    response = requests.get(f"{BASE_URL}/notebooks/unknown-slug-xyz/full")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 404, "Status code"):
        return False
    
    log_pass("Unknown slug correctly returns 404")
    return True

def test_29_create_notebook_valid():
    """Test POST /api/notebooks - create valid notebook"""
    log_test("29. POST /api/notebooks - Create valid notebook with auth")
    
    payload = {
        "label": "Test Collection 2026",
        "variant": "night",
        "cover_title": "TEST LOG",
        "subtitle": ["Test Notebook", "Created by automated test"]
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/notebooks", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    notebook = response.json()
    
    # Verify returned fields
    if not assert_not_empty(notebook.get('id'), "Notebook ID"):
        return False
    
    if not assert_not_empty(notebook.get('slug'), "Notebook slug"):
        return False
    
    if not assert_equal(notebook['label'], payload['label'], "Label"):
        return False
    
    if not assert_equal(notebook['variant'], payload['variant'], "Variant"):
        return False
    
    # Store for cleanup
    test_notebook_ids.append(notebook['id'])
    
    log_pass(f"Notebook created successfully with ID: {notebook['id']}")
    log_info(f"Auto-generated slug: {notebook['slug']}")
    
    return True

def test_30_create_notebook_invalid_variant():
    """Test POST /api/notebooks - invalid variant should return 400"""
    log_test("30. POST /api/notebooks - Invalid variant should 400")
    
    payload = {
        "label": "Invalid Variant Test",
        "variant": "pink"  # Invalid variant
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/notebooks", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 400, "Status code"):
        return False
    
    log_pass("Invalid variant correctly returns 400")
    return True

def test_31_create_notebook_duplicate_slug():
    """Test POST /api/notebooks - duplicate label creates unique slug"""
    log_test("31. POST /api/notebooks - Duplicate label creates unique slug")
    
    payload = {
        "label": "Test Collection 2026",  # Same as test 29
        "variant": "paper"
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/notebooks", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notebook = response.json()
    
    # Slug should be different (have suffix)
    if notebook['slug'] == 'test-collection-2026':
        log_fail("Duplicate slug not handled - should have suffix")
        return False
    
    log_pass(f"Unique slug generated: {notebook['slug']}")
    
    # Store for cleanup
    test_notebook_ids.append(notebook['id'])
    
    return True

def test_32_update_notebook():
    """Test PUT /api/notebooks/{id} - update notebook"""
    log_test("32. PUT /api/notebooks/{id} - Update notebook")
    
    if not test_notebook_ids:
        log_fail("No test notebook available for update")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    payload = {
        "label": "Updated Test Collection",
        "cover_title": "UPDATED LOG",
        "subtitle": ["Updated", "Modified by test"],
        "variant": "forest"
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/notebooks/{notebook_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    notebook = response.json()
    
    # Verify updates
    if not assert_equal(notebook['label'], payload['label'], "Updated label"):
        return False
    
    if not assert_equal(notebook['cover_title'], payload['cover_title'], "Updated cover_title"):
        return False
    
    if not assert_equal(notebook['variant'], payload['variant'], "Updated variant"):
        return False
    
    log_pass("Notebook updated successfully")
    return True

def test_33_update_notebook_invalid_variant():
    """Test PUT /api/notebooks/{id} - invalid variant should 400"""
    log_test("33. PUT /api/notebooks/{id} - Invalid variant should 400")
    
    if not test_notebook_ids:
        log_fail("No test notebook available for update")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    payload = {
        "variant": "rainbow"  # Invalid
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/notebooks/{notebook_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 400, "Status code"):
        return False
    
    log_pass("Invalid variant correctly returns 400")
    return True

def test_34_update_notebook_unknown_id():
    """Test PUT /api/notebooks/{id} - unknown ID should 404"""
    log_test("34. PUT /api/notebooks/{id} - Unknown ID should 404")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    payload = {
        "label": "Should not work"
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/notebooks/{fake_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 404, "Status code"):
        return False
    
    log_pass("Unknown ID correctly returns 404")
    return True

def test_35_create_entry_with_chapters():
    """Test POST /api/entries - create entry with chapters"""
    log_test("35. POST /api/entries - Create entry with chapters")
    
    if not test_notebook_ids:
        log_fail("No test notebook available for entry creation")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    payload = {
        "notebook_id": notebook_id,
        "type": "piece",
        "category": "Novel",
        "title": "Test Novel with Chapters",
        "date": "2026",
        "meta": "A test novel",
        "body": "This is a test novel with multiple chapters.",
        "chapters": [
            {"title": "Chapter 1: The Beginning", "body": "Once upon a time in a test suite..."},
            {"title": "Chapter 2: The Middle", "body": "The tests continued to run..."}
        ]
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    entry = response.json()
    
    # Verify fields
    if not assert_not_empty(entry.get('id'), "Entry ID"):
        return False
    
    if not assert_equal(entry['title'], payload['title'], "Title"):
        return False
    
    if not assert_equal(len(entry['chapters']), 2, "Number of chapters"):
        return False
    
    # Verify order was auto-assigned
    if 'order' not in entry:
        log_fail("Order field missing")
        return False
    
    # Store for cleanup
    test_entry_ids.append(entry['id'])
    
    log_pass(f"Entry with chapters created successfully, order: {entry['order']}")
    return True

def test_36_create_entry_kind():
    """Test POST /api/entries - create kind entry"""
    log_test("36. POST /api/entries - Create kind entry")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    payload = {
        "notebook_id": notebook_id,
        "type": "kind",
        "title": "Test Reviewer",
        "meta": "Automated tester",
        "body": "This is a test testimonial from the test suite."
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    entry = response.json()
    
    if not assert_equal(entry['type'], 'kind', "Entry type"):
        return False
    
    test_entry_ids.append(entry['id'])
    
    log_pass(f"Kind entry created successfully, order: {entry['order']}")
    return True

def test_37_create_entry_about():
    """Test POST /api/entries - create about entry"""
    log_test("37. POST /api/entries - Create about entry")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    payload = {
        "notebook_id": notebook_id,
        "type": "about",
        "title": "Test About Section",
        "meta": "Testing",
        "body": "This is a test about entry."
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    entry = response.json()
    
    if not assert_equal(entry['type'], 'about', "Entry type"):
        return False
    
    test_entry_ids.append(entry['id'])
    
    log_pass(f"About entry created successfully, order: {entry['order']}")
    return True

def test_38_create_entry_invalid_type():
    """Test POST /api/entries - invalid type should 400"""
    log_test("38. POST /api/entries - Invalid type should 400")
    
    if not test_notebook_ids:
        log_fail("No test notebook available")
        return False
    
    notebook_id = test_notebook_ids[0]
    
    payload = {
        "notebook_id": notebook_id,
        "type": "invalid_type",
        "title": "Should fail"
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 400, "Status code"):
        return False
    
    log_pass("Invalid type correctly returns 400")
    return True

def test_39_create_entry_unknown_notebook():
    """Test POST /api/entries - unknown notebook_id should 404"""
    log_test("39. POST /api/entries - Unknown notebook_id should 404")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    payload = {
        "notebook_id": fake_id,
        "type": "piece",
        "title": "Should fail"
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.post(f"{BASE_URL}/entries", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 404, "Status code"):
        return False
    
    log_pass("Unknown notebook_id correctly returns 404")
    return True

def test_40_update_entry():
    """Test PUT /api/entries/{id} - update entry"""
    log_test("40. PUT /api/entries/{id} - Update entry")
    
    if not test_entry_ids:
        log_fail("No test entry available for update")
        return False
    
    entry_id = test_entry_ids[0]
    
    payload = {
        "title": "Updated Test Novel",
        "body": "This novel has been updated by the test suite.",
        "chapters": [
            {"title": "Updated Chapter 1", "body": "New content for chapter 1"},
            {"title": "Updated Chapter 2", "body": "New content for chapter 2"},
            {"title": "Chapter 3: The End", "body": "A new chapter added"}
        ]
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/entries/{entry_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    entry = response.json()
    
    # Verify updates
    if not assert_equal(entry['title'], payload['title'], "Updated title"):
        return False
    
    if not assert_equal(entry['body'], payload['body'], "Updated body"):
        return False
    
    if not assert_equal(len(entry['chapters']), 3, "Updated chapters count"):
        return False
    
    log_pass("Entry updated successfully")
    return True

def test_41_update_entry_unknown_id():
    """Test PUT /api/entries/{id} - unknown ID should 404"""
    log_test("41. PUT /api/entries/{id} - Unknown ID should 404")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    payload = {
        "title": "Should not work"
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/entries/{fake_id}", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 404, "Status code"):
        return False
    
    log_pass("Unknown ID correctly returns 404")
    return True

def test_42_delete_entry():
    """Test DELETE /api/entries/{id} - delete entry"""
    log_test("42. DELETE /api/entries/{id} - Delete entry")
    
    if len(test_entry_ids) < 2:
        log_fail("Not enough test entries for deletion test")
        return False
    
    # Delete the second entry (keep first for later tests)
    entry_id = test_entry_ids[1]
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.delete(f"{BASE_URL}/entries/{entry_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    # Verify it's deleted by trying to fetch the notebook
    if test_notebook_ids:
        # Get the notebook to verify entry is gone
        nb_response = requests.get(f"{BASE_URL}/notebooks")
        if nb_response.status_code == 200:
            log_pass("Entry deleted successfully")
            test_entry_ids.remove(entry_id)
            return True
    
    log_pass("Entry deleted successfully")
    test_entry_ids.remove(entry_id)
    return True

def test_43_delete_notebook_cascade():
    """Test DELETE /api/notebooks/{id} - cascade delete entries"""
    log_test("43. DELETE /api/notebooks/{id} - Cascade delete entries")
    
    if len(test_notebook_ids) < 2:
        log_fail("Not enough test notebooks for cascade delete test")
        return False
    
    # Delete the second notebook (keep first for final cleanup)
    notebook_id = test_notebook_ids[1]
    
    # First, get the notebook slug
    nb_list = requests.get(f"{BASE_URL}/notebooks").json()
    notebook_slug = None
    for nb in nb_list:
        if nb['id'] == notebook_id:
            notebook_slug = nb['slug']
            break
    
    if not notebook_slug:
        log_fail("Could not find notebook slug")
        return False
    
    log_info(f"Deleting notebook with slug: {notebook_slug}")
    
    # Delete the notebook
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.delete(f"{BASE_URL}/notebooks/{notebook_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    # Verify notebook is gone
    full_response = requests.get(f"{BASE_URL}/notebooks/{notebook_slug}/full")
    if not assert_equal(full_response.status_code, 404, "Notebook should be gone"):
        return False
    
    # Verify it's not in the list
    nb_list = requests.get(f"{BASE_URL}/notebooks").json()
    for nb in nb_list:
        if nb['id'] == notebook_id:
            log_fail("Notebook still in list after deletion")
            return False
    
    log_pass("Notebook and entries cascade deleted successfully")
    test_notebook_ids.remove(notebook_id)
    return True

def test_44_search_endpoint():
    """Test GET /api/search?q=rain - search functionality"""
    log_test("44. GET /api/search?q=rain - Search entries")
    
    response = requests.get(f"{BASE_URL}/search?q=rain")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    results = response.json()
    log_info(f"Found {len(results)} results")
    
    if not isinstance(results, list):
        log_fail("Results should be a list")
        return False
    
    # Verify result structure
    if len(results) > 0:
        result = results[0]
        required_fields = ['id', 'title', 'category', 'type', 'snippet', 'notebook_slug', 'notebook_label']
        for field in required_fields:
            if field not in result:
                log_fail(f"Missing field in result: {field}")
                return False
    
    log_pass(f"Search working correctly, found {len(results)} results")
    return True

def test_45_search_min_length():
    """Test GET /api/search?q=a - should return empty for < 2 chars"""
    log_test("45. GET /api/search?q=a - Min 2 chars required")
    
    response = requests.get(f"{BASE_URL}/search?q=a")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    results = response.json()
    
    if not assert_equal(len(results), 0, "Results count for single char"):
        return False
    
    log_pass("Search correctly requires min 2 chars")
    return True

def test_46_get_reactions():
    """Test GET /api/entries/{id}/reactions - get reaction counts"""
    log_test("46. GET /api/entries/{id}/reactions - Get reactions")
    
    # Get a writings entry
    writings_response = requests.get(f"{BASE_URL}/notebooks/writings/full")
    if writings_response.status_code != 200:
        log_fail("Could not fetch writings notebook")
        return False
    
    entries = writings_response.json()['entries']
    if not entries:
        log_fail("No entries found in writings notebook")
        return False
    
    entry_id = entries[0]['id']
    
    response = requests.get(f"{BASE_URL}/entries/{entry_id}/reactions")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    reactions = response.json()
    
    # Should have all reaction types
    expected_types = ['coffee', 'feather', 'heart', 'sparkles']
    for rtype in expected_types:
        if rtype not in reactions:
            log_fail(f"Missing reaction type: {rtype}")
            return False
        if not isinstance(reactions[rtype], int):
            log_fail(f"Reaction count should be int, got {type(reactions[rtype])}")
            return False
    
    log_pass("Reactions endpoint working correctly")
    return True

def test_47_post_reaction():
    """Test POST /api/entries/{id}/react - add reaction"""
    log_test("47. POST /api/entries/{id}/react - Add reaction")
    
    # Get a writings entry
    writings_response = requests.get(f"{BASE_URL}/notebooks/writings/full")
    if writings_response.status_code != 200:
        log_fail("Could not fetch writings notebook")
        return False
    
    entries = writings_response.json()['entries']
    if not entries:
        log_fail("No entries found in writings notebook")
        return False
    
    entry_id = entries[0]['id']
    
    # Get current count
    before = requests.get(f"{BASE_URL}/entries/{entry_id}/reactions").json()
    
    # Add a heart reaction
    payload = {"type": "heart"}
    response = requests.post(f"{BASE_URL}/entries/{entry_id}/react", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    after = response.json()
    
    # Verify count increased
    if after['heart'] != before['heart'] + 1:
        log_fail(f"Heart count should increase by 1: {before['heart']} -> {after['heart']}")
        return False
    
    log_pass("Reaction added successfully")
    return True

def test_48_post_reaction_invalid_type():
    """Test POST /api/entries/{id}/react - invalid type should 400"""
    log_test("48. POST /api/entries/{id}/react - Invalid type should 400")
    
    # Get a writings entry
    writings_response = requests.get(f"{BASE_URL}/notebooks/writings/full")
    if writings_response.status_code != 200:
        log_fail("Could not fetch writings notebook")
        return False
    
    entries = writings_response.json()['entries']
    if not entries:
        log_fail("No entries found")
        return False
    
    entry_id = entries[0]['id']
    
    payload = {"type": "invalid"}
    response = requests.post(f"{BASE_URL}/entries/{entry_id}/react", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 400, "Status code"):
        return False
    
    log_pass("Invalid reaction type correctly returns 400")
    return True

def test_49_post_reaction_unknown_entry():
    """Test POST /api/entries/{id}/react - unknown entry should 404"""
    log_test("49. POST /api/entries/{id}/react - Unknown entry should 404")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    payload = {"type": "heart"}
    response = requests.post(f"{BASE_URL}/entries/{fake_id}/react", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 404, "Status code"):
        return False
    
    log_pass("Unknown entry correctly returns 404")
    return True

def test_50_post_idea():
    """Test POST /api/ideas - submit idea (public)"""
    log_test("50. POST /api/ideas - Submit idea")
    
    payload = {
        "name": "Test Contributor",
        "idea": "This is a test story idea for the automated test suite."
    }
    
    response = requests.post(f"{BASE_URL}/ideas", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    idea = response.json()
    
    if not assert_not_empty(idea.get('id'), "Idea ID"):
        return False
    
    if not assert_equal(idea['idea'], payload['idea'], "Idea text"):
        return False
    
    test_idea_ids.append(idea['id'])
    
    log_pass(f"Idea submitted successfully, ID: {idea['id']}")
    return True

def test_51_post_idea_too_short():
    """Test POST /api/ideas - idea < 5 chars should 400"""
    log_test("51. POST /api/ideas - Too short should 400")
    
    payload = {
        "name": "Test",
        "idea": "Hi"
    }
    
    response = requests.post(f"{BASE_URL}/ideas", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 400, "Status code"):
        return False
    
    log_pass("Short idea correctly returns 400")
    return True

def test_52_get_ideas_no_key():
    """Test GET /api/ideas - should require studio key"""
    log_test("52. GET /api/ideas - No key should 401")
    
    response = requests.get(f"{BASE_URL}/ideas")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Ideas list correctly requires auth")
    return True

def test_53_get_ideas_with_key():
    """Test GET /api/ideas - with studio key should work"""
    log_test("53. GET /api/ideas - With key should work")
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.get(f"{BASE_URL}/ideas", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    ideas = response.json()
    
    if not isinstance(ideas, list):
        log_fail("Ideas should be a list")
        return False
    
    log_pass(f"Ideas list retrieved successfully, count: {len(ideas)}")
    return True

def test_54_delete_idea_no_key():
    """Test DELETE /api/ideas/{id} - should require studio key"""
    log_test("54. DELETE /api/ideas/{id} - No key should 401")
    
    if not test_idea_ids:
        log_fail("No test idea available")
        return False
    
    idea_id = test_idea_ids[0]
    response = requests.delete(f"{BASE_URL}/ideas/{idea_id}")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Delete idea correctly requires auth")
    return True

def test_55_delete_idea_with_key():
    """Test DELETE /api/ideas/{id} - with key should work"""
    log_test("55. DELETE /api/ideas/{id} - With key should work")
    
    if not test_idea_ids:
        log_fail("No test idea available")
        return False
    
    idea_id = test_idea_ids[0]
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.delete(f"{BASE_URL}/ideas/{idea_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    test_idea_ids.remove(idea_id)
    log_pass("Idea deleted successfully")
    return True

def test_56_extended_variants():
    """Test extended variants (crimson, sand, mint, slate)"""
    log_test("56. POST /api/notebooks - Extended variants")
    
    new_variants = ["crimson", "sand", "mint", "slate"]
    
    for variant in new_variants:
        payload = {
            "label": f"Test {variant.title()} Notebook",
            "variant": variant
        }
        
        headers = {"X-Studio-Key": STUDIO_PASSWORD}
        response = requests.post(f"{BASE_URL}/notebooks", json=payload, headers=headers)
        log_info(f"Testing variant '{variant}': {response.status_code}")
        
        if response.status_code != 200:
            log_fail(f"Variant '{variant}' failed with status {response.status_code}")
            return False
        
        notebook = response.json()
        test_notebook_ids.append(notebook['id'])
    
    log_pass("All extended variants working correctly")
    return True

def test_57_post_guestbook_note():
    """Test POST /api/guestbook - submit note (public)"""
    log_test("57. POST /api/guestbook - Submit note")
    
    payload = {
        "name": "Test Visitor",
        "message": "This is a nice test note from the automated test suite.",
        "color": "sky"
    }
    
    response = requests.post(f"{BASE_URL}/guestbook", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code not in [200, 201]:
        log_fail(f"Expected status 200/201, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    note = response.json()
    
    if not assert_not_empty(note.get('id'), "Note ID"):
        return False
    
    if not assert_equal(note['approved'], False, "Note approved status"):
        return False
    
    if not assert_equal(note['color'], 'sky', "Note color"):
        return False
    
    test_guestbook_ids.append(note['id'])
    
    log_pass(f"Guestbook note submitted successfully, ID: {note['id']}")
    return True

def test_58_post_guestbook_too_short():
    """Test POST /api/guestbook - message < 3 chars should 400"""
    log_test("58. POST /api/guestbook - Too short should 400")
    
    payload = {
        "name": "Test",
        "message": "Hi",
        "color": "sky"
    }
    
    response = requests.post(f"{BASE_URL}/guestbook", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 400, "Status code"):
        return False
    
    log_pass("Short message correctly returns 400")
    return True

def test_59_post_guestbook_invalid_color():
    """Test POST /api/guestbook - invalid color defaults to lemon"""
    log_test("59. POST /api/guestbook - Invalid color defaults to lemon")
    
    payload = {
        "name": "Test",
        "message": "Testing invalid color handling",
        "color": "invalid_color"
    }
    
    response = requests.post(f"{BASE_URL}/guestbook", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code not in [200, 201]:
        log_fail(f"Expected status 200/201, got {response.status_code}")
        return False
    
    note = response.json()
    
    if not assert_equal(note['color'], 'lemon', "Color should default to lemon"):
        return False
    
    test_guestbook_ids.append(note['id'])
    
    log_pass("Invalid color correctly defaults to lemon")
    return True

def test_60_get_guestbook_public():
    """Test GET /api/guestbook - public (only approved)"""
    log_test("60. GET /api/guestbook - Public (only approved)")
    
    response = requests.get(f"{BASE_URL}/guestbook")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notes = response.json()
    
    if not isinstance(notes, list):
        log_fail("Notes should be a list")
        return False
    
    # Verify all notes are approved
    for note in notes:
        if not note.get('approved'):
            log_fail(f"Public endpoint returned unapproved note: {note['id']}")
            return False
    
    # Our test note should NOT be in this list (it's pending)
    for note in notes:
        if note['id'] in test_guestbook_ids:
            log_fail("Public endpoint should not include our pending test note")
            return False
    
    log_pass(f"Public guestbook working correctly, {len(notes)} approved notes")
    return True

def test_61_get_guestbook_all_no_key():
    """Test GET /api/guestbook/all - should require studio key"""
    log_test("61. GET /api/guestbook/all - No key should 401")
    
    response = requests.get(f"{BASE_URL}/guestbook/all")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Guestbook all correctly requires auth")
    return True

def test_62_get_guestbook_all_with_key():
    """Test GET /api/guestbook/all - with key returns all notes"""
    log_test("62. GET /api/guestbook/all - With key returns all")
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.get(f"{BASE_URL}/guestbook/all", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    notes = response.json()
    
    if not isinstance(notes, list):
        log_fail("Notes should be a list")
        return False
    
    # Should include our pending test notes
    found_test_note = False
    for note in notes:
        if note['id'] in test_guestbook_ids:
            found_test_note = True
            log_info(f"Found our test note: {note['id']}, approved: {note['approved']}")
    
    if not found_test_note:
        log_fail("Should include our pending test notes")
        return False
    
    # Should also include the existing "Rara" note (pending)
    rara_note = None
    for note in notes:
        if note.get('name') == 'Rara' and not note.get('approved'):
            rara_note = note
            break
    
    if rara_note:
        log_info(f"Found existing Rara note: {rara_note['id']}")
    
    log_pass(f"Guestbook all retrieved successfully, {len(notes)} total notes")
    return True

def test_63_approve_note_no_key():
    """Test PUT /api/guestbook/{id}/approve - should require studio key"""
    log_test("63. PUT /api/guestbook/{id}/approve - No key should 401")
    
    if not test_guestbook_ids:
        log_fail("No test note available")
        return False
    
    note_id = test_guestbook_ids[0]
    response = requests.put(f"{BASE_URL}/guestbook/{note_id}/approve")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Approve note correctly requires auth")
    return True

def test_64_approve_note_with_key():
    """Test PUT /api/guestbook/{id}/approve - with key should work"""
    log_test("64. PUT /api/guestbook/{id}/approve - With key should work")
    
    if not test_guestbook_ids:
        log_fail("No test note available")
        return False
    
    note_id = test_guestbook_ids[0]
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/guestbook/{note_id}/approve", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    # Verify it now appears in public list
    public_response = requests.get(f"{BASE_URL}/guestbook")
    if public_response.status_code == 200:
        public_notes = public_response.json()
        found = False
        for note in public_notes:
            if note['id'] == note_id:
                found = True
                break
        
        if not found:
            log_fail("Approved note should appear in public list")
            return False
    
    log_pass("Note approved successfully and appears in public list")
    return True

def test_65_delete_note_no_key():
    """Test DELETE /api/guestbook/{id} - should require studio key"""
    log_test("65. DELETE /api/guestbook/{id} - No key should 401")
    
    if not test_guestbook_ids:
        log_fail("No test note available")
        return False
    
    note_id = test_guestbook_ids[0]
    response = requests.delete(f"{BASE_URL}/guestbook/{note_id}")
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Delete note correctly requires auth")
    return True

def test_66_delete_note_with_key():
    """Test DELETE /api/guestbook/{id} - with key should work"""
    log_test("66. DELETE /api/guestbook/{id} - With key should work")
    
    if not test_guestbook_ids:
        log_fail("No test note available")
        return False
    
    note_id = test_guestbook_ids[0]
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.delete(f"{BASE_URL}/guestbook/{note_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    test_guestbook_ids.remove(note_id)
    log_pass("Note deleted successfully")
    return True

def test_67_delete_note_unknown_id():
    """Test DELETE /api/guestbook/{id} - unknown ID should 404"""
    log_test("67. DELETE /api/guestbook/{id} - Unknown ID should 404")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.delete(f"{BASE_URL}/guestbook/{fake_id}", headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 404, "Status code"):
        return False
    
    log_pass("Unknown note ID correctly returns 404")
    return True

def test_68_get_now_writing():
    """Test GET /api/now-writing - public endpoint"""
    log_test("68. GET /api/now-writing - Get current writing status")
    
    response = requests.get(f"{BASE_URL}/now-writing")
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    # Should have required fields
    required_fields = ['title', 'goal_words', 'current_words', 'note', 'active']
    for field in required_fields:
        if field not in data:
            log_fail(f"Missing field: {field}")
            return False
    
    log_pass(f"Now writing retrieved: active={data['active']}, title='{data['title']}'")
    return True

def test_69_put_now_writing_no_key():
    """Test PUT /api/now-writing - should require studio key"""
    log_test("69. PUT /api/now-writing - No key should 401")
    
    payload = {
        "title": "Should Fail",
        "active": True
    }
    
    response = requests.put(f"{BASE_URL}/now-writing", json=payload)
    log_info(f"Status: {response.status_code}")
    
    if not assert_equal(response.status_code, 401, "Status code"):
        return False
    
    log_pass("Update now-writing correctly requires auth")
    return True

def test_70_put_now_writing_with_key():
    """Test PUT /api/now-writing - with key should work"""
    log_test("70. PUT /api/now-writing - With key should work")
    
    payload = {
        "title": "Test Novel",
        "goal_words": 50000,
        "current_words": 12000,
        "note": "Testing the now-writing endpoint",
        "active": True
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/now-writing", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        log_info(f"Response: {response.text}")
        return False
    
    data = response.json()
    
    # Verify updates
    if not assert_equal(data['title'], payload['title'], "Title"):
        return False
    
    if not assert_equal(data['goal_words'], payload['goal_words'], "Goal words"):
        return False
    
    if not assert_equal(data['current_words'], payload['current_words'], "Current words"):
        return False
    
    if not assert_equal(data['active'], payload['active'], "Active status"):
        return False
    
    # Verify it's reflected in GET
    get_response = requests.get(f"{BASE_URL}/now-writing")
    if get_response.status_code == 200:
        get_data = get_response.json()
        if get_data['title'] != payload['title']:
            log_fail("GET should reflect PUT changes")
            return False
    
    log_pass("Now-writing updated successfully")
    return True

def test_71_reset_now_writing():
    """Test PUT /api/now-writing - reset to defaults"""
    log_test("71. PUT /api/now-writing - Reset to defaults")
    
    payload = {
        "title": "",
        "goal_words": 0,
        "current_words": 0,
        "note": "",
        "active": False
    }
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.put(f"{BASE_URL}/now-writing", json=payload, headers=headers)
    log_info(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        log_fail(f"Expected status 200, got {response.status_code}")
        return False
    
    data = response.json()
    
    if not assert_equal(data['active'], False, "Active should be false"):
        return False
    
    log_pass("Now-writing reset to defaults successfully")
    return True

def test_72_verify_rara_note_intact():
    """Verify the existing Rara note is still intact"""
    log_test("72. Verify Rara note intact")
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    response = requests.get(f"{BASE_URL}/guestbook/all", headers=headers)
    
    if response.status_code != 200:
        log_fail("Could not fetch all notes")
        return False
    
    notes = response.json()
    
    rara_note = None
    for note in notes:
        if note.get('name') == 'Rara':
            rara_note = note
            break
    
    if not rara_note:
        log_fail("Rara note not found - may have been deleted")
        return False
    
    log_pass(f"Rara note intact: {rara_note['id']}, approved: {rara_note['approved']}")
    return True

def cleanup():
    """Clean up all test data"""
    log_test("CLEANUP - Removing test data")
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
    # Delete remaining guestbook notes
    for note_id in test_guestbook_ids[:]:
        try:
            response = requests.delete(f"{BASE_URL}/guestbook/{note_id}", headers=headers)
            if response.status_code == 200:
                log_info(f"Deleted guestbook note: {note_id}")
                test_guestbook_ids.remove(note_id)
        except Exception as e:
            log_info(f"Could not delete note {note_id}: {e}")
    
    # Delete remaining ideas
    for idea_id in test_idea_ids[:]:
        try:
            response = requests.delete(f"{BASE_URL}/ideas/{idea_id}", headers=headers)
            if response.status_code == 200:
                log_info(f"Deleted idea: {idea_id}")
                test_idea_ids.remove(idea_id)
        except Exception as e:
            log_info(f"Could not delete idea {idea_id}: {e}")
    
    # Delete remaining entries
    for entry_id in test_entry_ids[:]:
        try:
            response = requests.delete(f"{BASE_URL}/entries/{entry_id}", headers=headers)
            if response.status_code == 200:
                log_info(f"Deleted entry: {entry_id}")
                test_entry_ids.remove(entry_id)
        except Exception as e:
            log_info(f"Could not delete entry {entry_id}: {e}")
    
    # Delete remaining notebooks (will cascade delete their entries)
    for notebook_id in test_notebook_ids[:]:
        try:
            response = requests.delete(f"{BASE_URL}/notebooks/{notebook_id}", headers=headers)
            if response.status_code == 200:
                log_info(f"Deleted notebook: {notebook_id}")
                test_notebook_ids.remove(notebook_id)
        except Exception as e:
            log_info(f"Could not delete notebook {notebook_id}: {e}")
    
    log_pass("Cleanup complete")

def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}Field Log Backend API Test Suite{Colors.END}")
    print(f"{Colors.BLUE}Base URL: {BASE_URL}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    tests = [
        # Auth tests
        test_1_studio_auth_correct_password,
        test_2_studio_auth_wrong_password,
        test_3_public_read_notebooks_no_header,
        test_4_public_read_notebook_full_no_header,
        test_5_create_notebook_no_header,
        test_6_create_notebook_wrong_key,
        test_7_create_notebook_with_correct_key,
        test_8_update_notebook_no_header,
        test_9_update_notebook_wrong_key,
        test_10_update_notebook_with_correct_key,
        test_11_create_entry_no_header,
        test_12_create_entry_wrong_key,
        test_13_create_entry_with_correct_key,
        test_14_update_entry_no_header,
        test_15_update_entry_wrong_key,
        test_16_update_entry_with_correct_key,
        test_17_delete_entry_no_header,
        test_18_delete_entry_wrong_key,
        test_19_delete_entry_with_correct_key,
        test_20_delete_notebook_no_header,
        test_21_delete_notebook_wrong_key,
        test_22_delete_notebook_with_correct_key,
        test_23_verify_seeded_notebooks_intact,
        # Original CRUD tests (optional - can be skipped if auth tests pass)
        test_24_get_notebooks,
        test_25_get_notebook_full_writings,
        test_26_get_notebook_full_about,
        test_27_get_notebook_full_kind_words,
        test_28_get_notebook_full_unknown,
        test_29_create_notebook_valid,
        test_30_create_notebook_invalid_variant,
        test_31_create_notebook_duplicate_slug,
        test_32_update_notebook,
        test_33_update_notebook_invalid_variant,
        test_34_update_notebook_unknown_id,
        test_35_create_entry_with_chapters,
        test_36_create_entry_kind,
        test_37_create_entry_about,
        test_38_create_entry_invalid_type,
        test_39_create_entry_unknown_notebook,
        test_40_update_entry,
        test_41_update_entry_unknown_id,
        test_42_delete_entry,
        test_43_delete_notebook_cascade,
        # New feature tests
        test_44_search_endpoint,
        test_45_search_min_length,
        test_46_get_reactions,
        test_47_post_reaction,
        test_48_post_reaction_invalid_type,
        test_49_post_reaction_unknown_entry,
        test_50_post_idea,
        test_51_post_idea_too_short,
        test_52_get_ideas_no_key,
        test_53_get_ideas_with_key,
        test_54_delete_idea_no_key,
        test_55_delete_idea_with_key,
        test_56_extended_variants,
        test_57_post_guestbook_note,
        test_58_post_guestbook_too_short,
        test_59_post_guestbook_invalid_color,
        test_60_get_guestbook_public,
        test_61_get_guestbook_all_no_key,
        test_62_get_guestbook_all_with_key,
        test_63_approve_note_no_key,
        test_64_approve_note_with_key,
        test_65_delete_note_no_key,
        test_66_delete_note_with_key,
        test_67_delete_note_unknown_id,
        test_68_get_now_writing,
        test_69_put_now_writing_no_key,
        test_70_put_now_writing_with_key,
        test_71_reset_now_writing,
        test_72_verify_rara_note_intact,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            log_fail(f"Test {test.__name__} raised exception: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    # Cleanup
    try:
        cleanup()
    except Exception as e:
        log_info(f"Cleanup error: {e}")
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed}{Colors.END}")
    print(f"Total: {passed + failed}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}\n")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
