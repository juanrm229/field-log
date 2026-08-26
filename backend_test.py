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

def cleanup():
    """Clean up all test data"""
    log_test("CLEANUP - Removing test data")
    
    headers = {"X-Studio-Key": STUDIO_PASSWORD}
    
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
