#!/usr/bin/env python3
"""
Backend API Testing for Push Notification System
Tests admin broadcast messaging and user-to-user messaging with push notifications
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://event-hub-okc-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@okcarevents.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
test_results = []

def log_test(test_name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status} - {test_name}"
    if details:
        result += f"\n    Details: {details}"
    test_results.append({"name": test_name, "passed": passed, "details": details})
    print(result)

def print_summary():
    """Print test summary"""
    total = len(test_results)
    passed = sum(1 for r in test_results if r["passed"])
    failed = total - passed
    
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print("="*70)
    
    if failed > 0:
        print("\nFailed Tests:")
        for r in test_results:
            if not r["passed"]:
                print(f"  ❌ {r['name']}")
                if r["details"]:
                    print(f"     {r['details']}")

# ==================== Test Setup ====================

def test_admin_login():
    """Test 1: Admin login to get admin_id"""
    print("\n" + "="*70)
    print("TEST 1: Admin Login")
    print("="*70)
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            user_data = data.get("user", {})
            admin_id = user_data.get("id")
            is_admin = user_data.get("isAdmin", False)
            
            if admin_id and is_admin:
                log_test("Admin Login", True, f"Admin ID: {admin_id}, isAdmin: {is_admin}")
                return admin_id
            else:
                log_test("Admin Login", False, f"User is not admin or missing ID: {data}")
                return None
        else:
            log_test("Admin Login", False, f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("Admin Login", False, f"Exception: {str(e)}")
        return None

def create_test_users(admin_id):
    """Create test users for messaging tests"""
    print("\n" + "="*70)
    print("TEST 2: Create Test Users")
    print("="*70)
    
    users = []
    timestamp = datetime.now().strftime("%H%M%S")
    
    for i in range(2):
        try:
            user_data = {
                "email": f"pushtest{i}_{timestamp}@test.com",
                "password": "testpass123",
                "name": f"Push Test User {i}",
                "nickname": f"pushuser{i}_{timestamp}"
            }
            
            response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                user_id = data.get("id")
                users.append({"id": user_id, "name": data.get("name"), "email": user_data["email"]})
                log_test(f"Create Test User {i}", True, f"User ID: {user_id}")
            else:
                log_test(f"Create Test User {i}", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            log_test(f"Create Test User {i}", False, f"Exception: {str(e)}")
    
    return users

# ==================== Admin Broadcast Tests ====================

def test_admin_broadcast(admin_id):
    """Test 3: Admin broadcast message to all users"""
    print("\n" + "="*70)
    print("TEST 3: Admin Broadcast Message")
    print("="*70)
    
    try:
        broadcast_content = f"🚨 SYSTEM ANNOUNCEMENT: This is a test broadcast message sent at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}. All users should receive this message!"
        
        response = requests.post(
            f"{BASE_URL}/admin/broadcast",
            params={"admin_id": admin_id},
            json={"content": broadcast_content}
        )
        
        if response.status_code == 200:
            data = response.json()
            success = data.get("success", False)
            messages_sent = data.get("messagesSent", 0)
            push_sent = data.get("pushNotificationsSent", 0)
            total_users = data.get("totalUsers", 0)
            
            if success and messages_sent > 0:
                log_test(
                    "Admin Broadcast", 
                    True, 
                    f"Success: {success}, Messages: {messages_sent}, Push: {push_sent}, Total Users: {total_users}"
                )
                return True
            else:
                log_test("Admin Broadcast", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Admin Broadcast", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Admin Broadcast", False, f"Exception: {str(e)}")
        return False

def test_broadcast_message_creation(admin_id, test_users):
    """Test 4: Verify broadcast messages were created in database"""
    print("\n" + "="*70)
    print("TEST 4: Verify Broadcast Messages in Database")
    print("="*70)
    
    if not test_users:
        log_test("Verify Broadcast Messages", False, "No test users available")
        return False
    
    try:
        # Check if test user received the broadcast message
        user_id = test_users[0]["id"]
        response = requests.get(f"{BASE_URL}/messages/conversations/{user_id}")
        
        if response.status_code == 200:
            conversations = response.json()
            
            # Look for conversation with admin
            admin_conversation = None
            for conv in conversations:
                if conv.get("partnerName") == "Admin" or "admin" in conv.get("partnerName", "").lower():
                    admin_conversation = conv
                    break
            
            if admin_conversation:
                log_test(
                    "Verify Broadcast Messages", 
                    True, 
                    f"Found admin conversation with last message: '{admin_conversation.get('lastMessage', '')[:50]}...'"
                )
                return True
            else:
                log_test("Verify Broadcast Messages", False, f"No admin conversation found. Conversations: {len(conversations)}")
                return False
        else:
            log_test("Verify Broadcast Messages", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Verify Broadcast Messages", False, f"Exception: {str(e)}")
        return False

# ==================== Direct Message Tests ====================

def test_direct_message_with_push(test_users):
    """Test 5: Send direct message between users"""
    print("\n" + "="*70)
    print("TEST 5: Direct Message with Push Notification")
    print("="*70)
    
    if len(test_users) < 2:
        log_test("Direct Message", False, "Need at least 2 test users")
        return False
    
    try:
        sender = test_users[0]
        recipient = test_users[1]
        
        message_content = f"Hey {recipient['name']}! This is a test message from {sender['name']} at {datetime.now().strftime('%H:%M:%S')}. Testing push notifications!"
        
        response = requests.post(
            f"{BASE_URL}/messages",
            json={
                "senderId": sender["id"],
                "recipientId": recipient["id"],
                "content": message_content
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            message_id = data.get("id")
            sender_id = data.get("senderId")
            recipient_id = data.get("recipientId")
            content = data.get("content")
            is_read = data.get("isRead")
            created_at = data.get("createdAt")
            
            if message_id and sender_id and recipient_id and content:
                log_test(
                    "Direct Message", 
                    True, 
                    f"Message ID: {message_id}, isRead: {is_read}, createdAt: {created_at}"
                )
                return True
            else:
                log_test("Direct Message", False, f"Missing required fields: {data}")
                return False
        else:
            log_test("Direct Message", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Direct Message", False, f"Exception: {str(e)}")
        return False

def test_message_thread(test_users):
    """Test 6: Retrieve message thread between users"""
    print("\n" + "="*70)
    print("TEST 6: Message Thread Retrieval")
    print("="*70)
    
    if len(test_users) < 2:
        log_test("Message Thread", False, "Need at least 2 test users")
        return False
    
    try:
        user1 = test_users[0]
        user2 = test_users[1]
        
        response = requests.get(f"{BASE_URL}/messages/thread/{user1['id']}/{user2['id']}")
        
        if response.status_code == 200:
            messages = response.json()
            
            if isinstance(messages, list) and len(messages) > 0:
                last_message = messages[-1]
                log_test(
                    "Message Thread", 
                    True, 
                    f"Found {len(messages)} messages. Last message: '{last_message.get('content', '')[:50]}...'"
                )
                return True
            else:
                log_test("Message Thread", False, f"No messages found in thread")
                return False
        else:
            log_test("Message Thread", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Message Thread", False, f"Exception: {str(e)}")
        return False

# ==================== Online Status Tests ====================

def test_user_online_status(test_users):
    """Test 7: Check user online status"""
    print("\n" + "="*70)
    print("TEST 7: User Online Status Check")
    print("="*70)
    
    if not test_users:
        log_test("User Online Status", False, "No test users available")
        return False
    
    try:
        user_id = test_users[0]["id"]
        response = requests.get(f"{BASE_URL}/messages/online/{user_id}")
        
        if response.status_code == 200:
            data = response.json()
            online = data.get("online")
            
            if isinstance(online, bool):
                log_test(
                    "User Online Status", 
                    True, 
                    f"User {user_id} online status: {online} (Expected: False for offline user)"
                )
                return True
            else:
                log_test("User Online Status", False, f"Invalid response format: {data}")
                return False
        else:
            log_test("User Online Status", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("User Online Status", False, f"Exception: {str(e)}")
        return False

def test_online_users_list():
    """Test 8: Get list of online users"""
    print("\n" + "="*70)
    print("TEST 8: Online Users List")
    print("="*70)
    
    try:
        response = requests.get(f"{BASE_URL}/messages/online")
        
        if response.status_code == 200:
            data = response.json()
            online_users = data.get("online_users")
            
            if isinstance(online_users, list):
                log_test(
                    "Online Users List", 
                    True, 
                    f"Found {len(online_users)} online users (Expected: 0 for no WebSocket connections)"
                )
                return True
            else:
                log_test("Online Users List", False, f"Invalid response format: {data}")
                return False
        else:
            log_test("Online Users List", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Online Users List", False, f"Exception: {str(e)}")
        return False

# ==================== Push Token Handling Tests ====================

def test_missing_push_token_handling(test_users):
    """Test 9: Verify system handles missing push tokens gracefully"""
    print("\n" + "="*70)
    print("TEST 9: Missing Push Token Handling")
    print("="*70)
    
    if len(test_users) < 2:
        log_test("Missing Push Token", False, "Need at least 2 test users")
        return False
    
    try:
        # Send message to user without push token (test users don't have tokens)
        sender = test_users[0]
        recipient = test_users[1]
        
        response = requests.post(
            f"{BASE_URL}/messages",
            json={
                "senderId": sender["id"],
                "recipientId": recipient["id"],
                "content": "Testing graceful handling of missing push token"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            message_id = data.get("id")
            
            if message_id:
                log_test(
                    "Missing Push Token", 
                    True, 
                    "Message created successfully despite missing push token (graceful handling confirmed)"
                )
                return True
            else:
                log_test("Missing Push Token", False, f"Message creation failed: {data}")
                return False
        else:
            log_test("Missing Push Token", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Missing Push Token", False, f"Exception: {str(e)}")
        return False

def test_broadcast_without_tokens(admin_id):
    """Test 10: Admin broadcast with users having no push tokens"""
    print("\n" + "="*70)
    print("TEST 10: Broadcast Without Push Tokens")
    print("="*70)
    
    try:
        response = requests.post(
            f"{BASE_URL}/admin/broadcast",
            params={"admin_id": admin_id},
            json={"content": "Testing broadcast with users who have no push tokens"}
        )
        
        if response.status_code == 200:
            data = response.json()
            success = data.get("success", False)
            messages_sent = data.get("messagesSent", 0)
            push_sent = data.get("pushNotificationsSent", 0)
            
            # Should succeed even if push notifications fail
            if success and messages_sent > 0:
                log_test(
                    "Broadcast Without Tokens", 
                    True, 
                    f"Messages sent: {messages_sent}, Push sent: {push_sent} (System handles missing tokens gracefully)"
                )
                return True
            else:
                log_test("Broadcast Without Tokens", False, f"Unexpected response: {data}")
                return False
        else:
            log_test("Broadcast Without Tokens", False, f"Status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_test("Broadcast Without Tokens", False, f"Exception: {str(e)}")
        return False

# ==================== Main Test Runner ====================

def main():
    print("\n" + "="*70)
    print("PUSH NOTIFICATION SYSTEM TESTING")
    print("Testing Admin Broadcast and User Messaging with Push Notifications")
    print("="*70)
    
    # Test 1: Admin Login
    admin_id = test_admin_login()
    if not admin_id:
        print("\n❌ CRITICAL: Admin login failed. Cannot proceed with tests.")
        print_summary()
        return
    
    # Test 2: Create Test Users
    test_users = create_test_users(admin_id)
    if len(test_users) < 2:
        print("\n⚠️  WARNING: Could not create enough test users. Some tests may be skipped.")
    
    # Test 3-4: Admin Broadcast Tests
    test_admin_broadcast(admin_id)
    test_broadcast_message_creation(admin_id, test_users)
    
    # Test 5-6: Direct Message Tests
    test_direct_message_with_push(test_users)
    test_message_thread(test_users)
    
    # Test 7-8: Online Status Tests
    test_user_online_status(test_users)
    test_online_users_list()
    
    # Test 9-10: Push Token Handling Tests
    test_missing_push_token_handling(test_users)
    test_broadcast_without_tokens(admin_id)
    
    # Print Summary
    print_summary()

if __name__ == "__main__":
    main()
