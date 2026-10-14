#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for StreetMotion Talent System
Tests all talent-related endpoints with realistic data
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://event-hub-okc-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@okcarevents.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        status = "✅ PASS"
    else:
        tests_failed += 1
        status = "❌ FAIL"
    
    result = f"{status} - {test_name}"
    if details:
        result += f"\n    Details: {details}"
    test_results.append(result)
    print(result)

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TALENT SYSTEM TEST SUMMARY")
    print("="*80)
    total = tests_passed + tests_failed
    print(f"Total Tests: {total}")
    print(f"Passed: {tests_passed} ({(tests_passed/total*100) if total > 0 else 0:.1f}%)")
    print(f"Failed: {tests_failed} ({(tests_failed/total*100) if total > 0 else 0:.1f}%)")
    print("="*80)
    if tests_failed > 0:
        print("\nFailed Tests:")
        for result in test_results:
            if "❌" in result:
                print(result)

# ==================== Test Data ====================
admin_id = None
test_user_id = None
invite_code = None
invite_code_shareable = None
talent_profile_id = None

# ==================== 1. ADMIN LOGIN ====================
print("\n" + "="*80)
print("1. ADMIN AUTHENTICATION")
print("="*80)

try:
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        admin_id = data.get("user", {}).get("id")
        log_test("Admin Login", True, f"Admin ID: {admin_id}")
    else:
        log_test("Admin Login", False, f"Status: {response.status_code}, Response: {response.text}")
except Exception as e:
    log_test("Admin Login", False, f"Exception: {str(e)}")

# ==================== 2. CREATE TEST USER ====================
print("\n" + "="*80)
print("2. CREATE TEST USER FOR TALENT INVITE")
print("="*80)

try:
    test_email = f"talent_test_{datetime.now().timestamp()}@test.com"
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": test_email,
            "password": "test123",
            "name": "Talent Test User",
            "nickname": f"talentuser{int(datetime.now().timestamp())}"
        }
    )
    
    if response.status_code == 200:
        data = response.json()
        test_user_id = data.get("id")
        log_test("Create Test User", True, f"User ID: {test_user_id}, Email: {test_email}")
    else:
        log_test("Create Test User", False, f"Status: {response.status_code}, Response: {response.text}")
except Exception as e:
    log_test("Create Test User", False, f"Exception: {str(e)}")

# ==================== 3. ADMIN INVITE CREATION ====================
print("\n" + "="*80)
print("3. ADMIN INVITE CREATION")
print("="*80)

# Test 3.1: Create invite with email
if admin_id:
    try:
        unique_email = f"photographer_{datetime.now().timestamp()}@test.com"
        response = requests.post(
            f"{BASE_URL}/admin/talent/invite",
            params={
                "admin_id": admin_id,
                "email": unique_email,
                "generate_code": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            invite_code = data.get("invite", {}).get("code")
            log_test("Create Invite with Email", True, f"Code: {invite_code}, Email: {unique_email}")
        else:
            log_test("Create Invite with Email", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Create Invite with Email", False, f"Exception: {str(e)}")

# Test 3.2: Create shareable invite (no email)
if admin_id:
    try:
        response = requests.post(
            f"{BASE_URL}/admin/talent/invite",
            params={
                "admin_id": admin_id,
                "generate_code": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            invite_code_shareable = data.get("invite", {}).get("code")
            log_test("Create Shareable Invite", True, f"Code: {invite_code_shareable}")
        else:
            log_test("Create Shareable Invite", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Create Shareable Invite", False, f"Exception: {str(e)}")

# Test 3.3: Verify invite response structure
if invite_code:
    try:
        unique_email2 = f"model_{datetime.now().timestamp()}@test.com"
        response = requests.post(
            f"{BASE_URL}/admin/talent/invite",
            params={
                "admin_id": admin_id,
                "email": unique_email2,
                "generate_code": True
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            invite = data.get("invite", {})
            has_required_fields = all(key in invite for key in ["code", "status", "expiresAt"])
            log_test("Invite Response Structure", has_required_fields, 
                    f"Has code: {bool(invite.get('code'))}, status: {invite.get('status')}, expiresAt: {bool(invite.get('expiresAt'))}")
        else:
            log_test("Invite Response Structure", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Invite Response Structure", False, f"Exception: {str(e)}")

# ==================== 4. GET INVITES ====================
print("\n" + "="*80)
print("4. GET INVITES")
print("="*80)

# Test 4.1: Get all invites
if admin_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/talent/invites",
            params={"admin_id": admin_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            invites = data.get("invites", [])
            log_test("Get All Invites", True, f"Found {len(invites)} invites")
        else:
            log_test("Get All Invites", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Get All Invites", False, f"Exception: {str(e)}")

# Test 4.2: Filter by status (pending)
if admin_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/talent/invites",
            params={"admin_id": admin_id, "status": "pending"}
        )
        
        if response.status_code == 200:
            data = response.json()
            invites = data.get("invites", [])
            all_pending = all(inv.get("status") == "pending" for inv in invites)
            log_test("Filter Invites by Status (pending)", all_pending, f"Found {len(invites)} pending invites")
        else:
            log_test("Filter Invites by Status (pending)", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Filter Invites by Status (pending)", False, f"Exception: {str(e)}")

# Test 4.3: Filter by status (accepted)
if admin_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/talent/invites",
            params={"admin_id": admin_id, "status": "accepted"}
        )
        
        if response.status_code == 200:
            data = response.json()
            invites = data.get("invites", [])
            log_test("Filter Invites by Status (accepted)", True, f"Found {len(invites)} accepted invites")
        else:
            log_test("Filter Invites by Status (accepted)", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Filter Invites by Status (accepted)", False, f"Exception: {str(e)}")

# ==================== 5. VALIDATE INVITE CODE ====================
print("\n" + "="*80)
print("5. VALIDATE INVITE CODE")
print("="*80)

# Test 5.1: Validate pending invite code
if invite_code_shareable:
    try:
        response = requests.get(f"{BASE_URL}/talent/invite/{invite_code_shareable}")
        
        if response.status_code == 200:
            data = response.json()
            is_valid = data.get("valid", False)
            log_test("Validate Pending Invite Code", is_valid, f"Code: {invite_code_shareable}, Valid: {is_valid}")
        else:
            log_test("Validate Pending Invite Code", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Validate Pending Invite Code", False, f"Exception: {str(e)}")

# Test 5.2: Test invalid code handling
try:
    response = requests.get(f"{BASE_URL}/talent/invite/INVALID_CODE_12345")
    
    if response.status_code == 404:
        log_test("Invalid Code Handling", True, "Correctly returns 404 for invalid code")
    else:
        log_test("Invalid Code Handling", False, f"Expected 404, got {response.status_code}")
except Exception as e:
    log_test("Invalid Code Handling", False, f"Exception: {str(e)}")

# ==================== 6. ACCEPT INVITE ====================
print("\n" + "="*80)
print("6. ACCEPT INVITE")
print("="*80)

# Test 6.1: Accept invite with test user
if invite_code_shareable and test_user_id:
    try:
        response = requests.post(
            f"{BASE_URL}/talent/invite/{invite_code_shareable}/accept",
            params={"user_id": test_user_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            profile = data.get("profile", {})
            talent_profile_id = profile.get("id")
            log_test("Accept Invite", True, f"Profile created with ID: {talent_profile_id}")
        else:
            log_test("Accept Invite", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Accept Invite", False, f"Exception: {str(e)}")

# Test 6.2: Verify user gets talent profile
if test_user_id:
    try:
        response = requests.get(
            f"{BASE_URL}/talent/check/{test_user_id}"
        )
        
        if response.status_code == 200:
            data = response.json()
            is_talent = data.get("isTalent", False)
            has_profile = data.get("hasProfile", False)
            log_test("User Has Talent Profile", is_talent and has_profile, 
                    f"isTalent: {is_talent}, hasProfile: {has_profile}")
        else:
            log_test("User Has Talent Profile", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("User Has Talent Profile", False, f"Exception: {str(e)}")

# Test 6.3: Verify invite status changed to accepted
if invite_code_shareable and admin_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/talent/invites",
            params={"admin_id": admin_id, "status": "accepted"}
        )
        
        if response.status_code == 200:
            data = response.json()
            invites = data.get("invites", [])
            accepted_invite = next((inv for inv in invites if inv.get("code") == invite_code_shareable), None)
            log_test("Invite Status Changed to Accepted", accepted_invite is not None, 
                    f"Found accepted invite with code: {invite_code_shareable}")
        else:
            log_test("Invite Status Changed to Accepted", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Invite Status Changed to Accepted", False, f"Exception: {str(e)}")

# ==================== 7. TALENT PROFILE OPERATIONS ====================
print("\n" + "="*80)
print("7. TALENT PROFILE OPERATIONS")
print("="*80)

# Test 7.1: Get own profile
if test_user_id:
    try:
        response = requests.get(
            f"{BASE_URL}/talent/my-profile",
            params={"user_id": test_user_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            has_view_count = "viewCount" in data
            log_test("Get Own Profile", True, f"Profile retrieved, has viewCount: {has_view_count}")
        else:
            log_test("Get Own Profile", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Get Own Profile", False, f"Exception: {str(e)}")

# Test 7.2: Update profile with category, photos, bio, etc.
if talent_profile_id and test_user_id:
    try:
        update_data = {
            "category": "photographer",
            "businessName": "Street Photography Pro",
            "displayName": "Mike the Photographer",
            "bio": "Professional automotive photographer specializing in car shows and street racing events. 10+ years experience capturing the perfect shot.",
            "serviceTags": ["automotive photography", "event coverage", "action shots", "portrait photography"],
            "location": "Oklahoma City, OK",
            "serviceArea": "Oklahoma and surrounding states",
            "availability": "available",
            "photos": [
                "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800",
                "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800"
            ],
            "contactEmail": "mike@streetphotopro.com",
            "contactPhone": "(405) 555-0123",
            "externalLink": "https://streetphotopro.com",
            "socialLinks": {
                "instagram": "@streetphotopro",
                "tiktok": "@mikephotographer",
                "youtube": "StreetPhotoPro",
                "facebook": "streetphotopro"
            },
            "isActive": True
        }
        
        response = requests.put(
            f"{BASE_URL}/talent/{talent_profile_id}",
            params={"user_id": test_user_id},
            json=update_data
        )
        
        if response.status_code == 200:
            data = response.json()
            profile = data.get("profile", {})
            log_test("Update Profile", True, 
                    f"Category: {profile.get('category')}, Photos: {len(profile.get('photos', []))}, Active: {profile.get('isActive')}")
        else:
            log_test("Update Profile", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Update Profile", False, f"Exception: {str(e)}")

# Test 7.3: List all active talent
try:
    response = requests.get(f"{BASE_URL}/talent")
    
    if response.status_code == 200:
        data = response.json()
        talent_list = data.get("talent", [])
        log_test("List All Active Talent", True, f"Found {len(talent_list)} active talent profiles")
    else:
        log_test("List All Active Talent", False, f"Status: {response.status_code}, Response: {response.text}")
except Exception as e:
    log_test("List All Active Talent", False, f"Exception: {str(e)}")

# Test 7.4: Get specific talent profile
if talent_profile_id:
    try:
        response = requests.get(f"{BASE_URL}/talent/{talent_profile_id}")
        
        if response.status_code == 200:
            data = response.json()
            log_test("Get Specific Talent Profile", True, 
                    f"Profile ID: {data.get('id')}, Category: {data.get('category')}")
        else:
            log_test("Get Specific Talent Profile", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Get Specific Talent Profile", False, f"Exception: {str(e)}")

# Test 7.5: Verify view count increment
if talent_profile_id:
    try:
        # Get initial view count
        response1 = requests.get(
            f"{BASE_URL}/talent/my-profile",
            params={"user_id": test_user_id}
        )
        initial_views = response1.json().get("viewCount", 0) if response1.status_code == 200 else 0
        
        # View profile (should increment)
        requests.get(f"{BASE_URL}/talent/{talent_profile_id}")
        
        # Get updated view count
        response2 = requests.get(
            f"{BASE_URL}/talent/my-profile",
            params={"user_id": test_user_id}
        )
        updated_views = response2.json().get("viewCount", 0) if response2.status_code == 200 else 0
        
        log_test("View Count Increment", updated_views > initial_views, 
                f"Initial: {initial_views}, After view: {updated_views}")
    except Exception as e:
        log_test("View Count Increment", False, f"Exception: {str(e)}")

# ==================== 8. FAVORITES ====================
print("\n" + "="*80)
print("8. FAVORITES")
print("="*80)

# Create another test user for favorites testing
favorite_user_id = None
try:
    test_email2 = f"favorite_user_{datetime.now().timestamp()}@test.com"
    response = requests.post(
        f"{BASE_URL}/auth/register",
        json={
            "email": test_email2,
            "password": "test123",
            "name": "Favorite Test User",
            "nickname": f"favuser{int(datetime.now().timestamp())}"
        }
    )
    
    if response.status_code == 200:
        favorite_user_id = response.json().get("id")
        log_test("Create Favorite Test User", True, f"User ID: {favorite_user_id}")
    else:
        log_test("Create Favorite Test User", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Create Favorite Test User", False, f"Exception: {str(e)}")

# Test 8.1: Toggle favorite (add)
if talent_profile_id and favorite_user_id:
    try:
        response = requests.post(
            f"{BASE_URL}/talent/{talent_profile_id}/favorite",
            params={"user_id": favorite_user_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            favorited = data.get("favorited", False)
            log_test("Add to Favorites", favorited, f"Favorited: {favorited}")
        else:
            log_test("Add to Favorites", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Add to Favorites", False, f"Exception: {str(e)}")

# Test 8.2: Get user's favorites
if favorite_user_id:
    try:
        response = requests.get(f"{BASE_URL}/talent/favorites/{favorite_user_id}")
        
        if response.status_code == 200:
            data = response.json()
            favorites = data.get("talent", [])
            log_test("Get User Favorites", True, f"Found {len(favorites)} favorites")
        else:
            log_test("Get User Favorites", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Get User Favorites", False, f"Exception: {str(e)}")

# Test 8.3: Toggle favorite (remove)
if talent_profile_id and favorite_user_id:
    try:
        response = requests.post(
            f"{BASE_URL}/talent/{talent_profile_id}/favorite",
            params={"user_id": favorite_user_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            favorited = data.get("favorited", False)
            log_test("Remove from Favorites", not favorited, f"Favorited: {favorited}")
        else:
            log_test("Remove from Favorites", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Remove from Favorites", False, f"Exception: {str(e)}")

# ==================== 9. ADMIN CONTROLS ====================
print("\n" + "="*80)
print("9. ADMIN CONTROLS")
print("="*80)

# Test 9.1: Toggle pinned
if talent_profile_id and admin_id:
    try:
        response = requests.put(
            f"{BASE_URL}/admin/talent/{talent_profile_id}/pin",
            params={"admin_id": admin_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            is_pinned = data.get("isPinned", False)
            log_test("Toggle Pinned (ON)", is_pinned, f"isPinned: {is_pinned}")
        else:
            log_test("Toggle Pinned (ON)", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Toggle Pinned (ON)", False, f"Exception: {str(e)}")

# Test 9.2: Toggle featured
if talent_profile_id and admin_id:
    try:
        response = requests.put(
            f"{BASE_URL}/admin/talent/{talent_profile_id}/feature",
            params={"admin_id": admin_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            is_featured = data.get("isFeatured", False)
            log_test("Toggle Featured (ON)", is_featured, f"isFeatured: {is_featured}")
        else:
            log_test("Toggle Featured (ON)", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Toggle Featured (ON)", False, f"Exception: {str(e)}")

# Test 9.3: Toggle verified
if talent_profile_id and admin_id:
    try:
        response = requests.put(
            f"{BASE_URL}/admin/talent/{talent_profile_id}/verify",
            params={"admin_id": admin_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            is_verified = data.get("isVerified", False)
            log_test("Toggle Verified (ON)", is_verified, f"isVerified: {is_verified}")
        else:
            log_test("Toggle Verified (ON)", False, f"Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        log_test("Toggle Verified (ON)", False, f"Exception: {str(e)}")

# Test 9.4: Verify notification created for verification
if test_user_id:
    try:
        response = requests.get(f"{BASE_URL}/notifications/{test_user_id}")
        
        if response.status_code == 200:
            data = response.json()
            notifications = data if isinstance(data, list) else []
            verified_notif = next((n for n in notifications if n.get("type") == "talent_verified"), None)
            log_test("Verification Notification Created", verified_notif is not None, 
                    f"Found talent_verified notification: {bool(verified_notif)}")
        else:
            log_test("Verification Notification Created", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Verification Notification Created", False, f"Exception: {str(e)}")

# Test 9.5: Verify pinned talent appears first in list
if talent_profile_id:
    try:
        response = requests.get(f"{BASE_URL}/talent")
        
        if response.status_code == 200:
            data = response.json()
            talent_list = data.get("talent", [])
            if talent_list:
                first_talent = talent_list[0]
                is_first_pinned = first_talent.get("id") == talent_profile_id and first_talent.get("isPinned")
                log_test("Pinned Talent Appears First", is_first_pinned, 
                        f"First talent ID: {first_talent.get('id')}, isPinned: {first_talent.get('isPinned')}")
            else:
                log_test("Pinned Talent Appears First", False, "No talent in list")
        else:
            log_test("Pinned Talent Appears First", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Pinned Talent Appears First", False, f"Exception: {str(e)}")

# ==================== 10. ADDITIONAL TESTS ====================
print("\n" + "="*80)
print("10. ADDITIONAL VALIDATION TESTS")
print("="*80)

# Test 10.1: Non-admin cannot create invites
if test_user_id:
    try:
        response = requests.post(
            f"{BASE_URL}/admin/talent/invite",
            params={
                "admin_id": test_user_id,  # Non-admin user
                "generate_code": True
            }
        )
        
        if response.status_code == 403:
            log_test("Non-Admin Cannot Create Invites", True, "Correctly returns 403 Forbidden")
        else:
            log_test("Non-Admin Cannot Create Invites", False, f"Expected 403, got {response.status_code}")
    except Exception as e:
        log_test("Non-Admin Cannot Create Invites", False, f"Exception: {str(e)}")

# Test 10.2: Cannot accept invite twice (user already has profile)
if test_user_id:
    try:
        # Create a new invite
        response_invite = requests.post(
            f"{BASE_URL}/admin/talent/invite",
            params={
                "admin_id": admin_id,
                "generate_code": True
            }
        )
        
        if response_invite.status_code == 200:
            new_code = response_invite.json().get("invite", {}).get("code")
            # Try to accept with user who already has a profile
            response = requests.post(
                f"{BASE_URL}/talent/invite/{new_code}/accept",
                params={"user_id": test_user_id}
            )
            
            if response.status_code == 400:
                log_test("Cannot Accept Invite Twice", True, f"Correctly returns 400: {response.json().get('detail', '')}")
            else:
                log_test("Cannot Accept Invite Twice", False, f"Expected 400, got {response.status_code}")
        else:
            log_test("Cannot Accept Invite Twice", False, "Failed to create test invite")
    except Exception as e:
        log_test("Cannot Accept Invite Twice", False, f"Exception: {str(e)}")

# Test 10.3: Filter talent by category
try:
    response = requests.get(
        f"{BASE_URL}/talent",
        params={"category": "photographer"}
    )
    
    if response.status_code == 200:
        data = response.json()
        talent_list = data.get("talent", [])
        all_photographers = all(t.get("category") == "photographer" for t in talent_list)
        log_test("Filter Talent by Category", all_photographers or len(talent_list) == 0, 
                f"Found {len(talent_list)} photographers")
    else:
        log_test("Filter Talent by Category", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Filter Talent by Category", False, f"Exception: {str(e)}")

# Test 10.4: Search talent
try:
    response = requests.get(
        f"{BASE_URL}/talent",
        params={"search": "photography"}
    )
    
    if response.status_code == 200:
        data = response.json()
        talent_list = data.get("talent", [])
        log_test("Search Talent", True, f"Found {len(talent_list)} results for 'photography'")
    else:
        log_test("Search Talent", False, f"Status: {response.status_code}")
except Exception as e:
    log_test("Search Talent", False, f"Exception: {str(e)}")

# Test 10.5: Admin get all talent (including inactive)
if admin_id:
    try:
        response = requests.get(
            f"{BASE_URL}/admin/talent/all",
            params={"admin_id": admin_id}
        )
        
        if response.status_code == 200:
            data = response.json()
            all_talent = data.get("talent", [])
            log_test("Admin Get All Talent", True, f"Found {len(all_talent)} total talent profiles")
        else:
            log_test("Admin Get All Talent", False, f"Status: {response.status_code}")
    except Exception as e:
        log_test("Admin Get All Talent", False, f"Exception: {str(e)}")

# ==================== PRINT SUMMARY ====================
print_summary()
