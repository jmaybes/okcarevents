#!/usr/bin/env python3
"""
Backend API Testing for Event Flyer Generation
Tests the Event Flyer Generation API endpoint at /api/events/{event_id}/flyer
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://event-hub-okc-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def test_event_flyer_generation():
    """Test the Event Flyer Generation API endpoint"""
    print("=" * 80)
    print("TESTING: Event Flyer Generation API")
    print("=" * 80)
    
    results = {
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "details": []
    }
    
    # Test 1: Valid event flyer generation
    print("\n1. Testing valid event flyer generation...")
    results["total_tests"] += 1
    
    test_event_id = "69e75808e72f540b46991d6d"
    url = f"{API_BASE}/events/{test_event_id}/flyer"
    
    try:
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            # Check content type
            content_type = response.headers.get('content-type', '')
            if content_type == 'image/jpeg':
                # Check JPEG magic bytes (FF D8 FF)
                content = response.content
                if len(content) > 3 and content[0] == 0xFF and content[1] == 0xD8 and content[2] == 0xFF:
                    # Check image size (should be >10KB, <500KB)
                    size_kb = len(content) / 1024
                    if 10 < size_kb < 500:
                        # Check required headers
                        cache_control = response.headers.get('cache-control', '')
                        content_disposition = response.headers.get('content-disposition', '')
                        
                        if cache_control and content_disposition:
                            print(f"   ✅ PASS: Valid flyer generated")
                            print(f"      - Status: {response.status_code}")
                            print(f"      - Content-Type: {content_type}")
                            print(f"      - Size: {size_kb:.1f} KB")
                            print(f"      - Cache-Control: {cache_control}")
                            print(f"      - Content-Disposition: {content_disposition}")
                            print(f"      - JPEG magic bytes: Valid")
                            results["passed"] += 1
                            results["details"].append("✅ Valid event flyer generation - PASS")
                        else:
                            print(f"   ❌ FAIL: Missing required headers")
                            print(f"      - Cache-Control: {cache_control}")
                            print(f"      - Content-Disposition: {content_disposition}")
                            results["failed"] += 1
                            results["details"].append("❌ Valid event flyer generation - Missing headers")
                    else:
                        print(f"   ❌ FAIL: Image size out of range: {size_kb:.1f} KB (expected 10-500 KB)")
                        results["failed"] += 1
                        results["details"].append(f"❌ Valid event flyer generation - Size {size_kb:.1f} KB out of range")
                else:
                    print(f"   ❌ FAIL: Invalid JPEG magic bytes")
                    print(f"      - First 3 bytes: {content[:3].hex() if len(content) >= 3 else 'N/A'}")
                    results["failed"] += 1
                    results["details"].append("❌ Valid event flyer generation - Invalid JPEG magic bytes")
            else:
                print(f"   ❌ FAIL: Wrong content type: {content_type} (expected image/jpeg)")
                results["failed"] += 1
                results["details"].append(f"❌ Valid event flyer generation - Wrong content type: {content_type}")
        else:
            print(f"   ❌ FAIL: HTTP {response.status_code}")
            print(f"      Response: {response.text[:200]}")
            results["failed"] += 1
            results["details"].append(f"❌ Valid event flyer generation - HTTP {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ FAIL: Exception - {e}")
        results["failed"] += 1
        results["details"].append(f"❌ Valid event flyer generation - Exception: {e}")
    
    # Test 2: Invalid event ID
    print("\n2. Testing invalid event ID...")
    results["total_tests"] += 1
    
    invalid_id = "invalid-id"
    url = f"{API_BASE}/events/{invalid_id}/flyer"
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 400:
            response_data = response.json()
            if "Invalid event ID" in response_data.get("detail", ""):
                print(f"   ✅ PASS: Invalid ID correctly rejected")
                print(f"      - Status: {response.status_code}")
                print(f"      - Message: {response_data.get('detail')}")
                results["passed"] += 1
                results["details"].append("✅ Invalid event ID handling - PASS")
            else:
                print(f"   ❌ FAIL: Wrong error message: {response_data.get('detail')}")
                results["failed"] += 1
                results["details"].append(f"❌ Invalid event ID handling - Wrong error message")
        else:
            print(f"   ❌ FAIL: Expected 400, got {response.status_code}")
            print(f"      Response: {response.text[:200]}")
            results["failed"] += 1
            results["details"].append(f"❌ Invalid event ID handling - Expected 400, got {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ FAIL: Exception - {e}")
        results["failed"] += 1
        results["details"].append(f"❌ Invalid event ID handling - Exception: {e}")
    
    # Test 3: Non-existent event (valid ObjectId format)
    print("\n3. Testing non-existent event...")
    results["total_tests"] += 1
    
    nonexistent_id = "aaaaaaaaaaaaaaaaaaaaaaaa"  # Valid ObjectId format but doesn't exist
    url = f"{API_BASE}/events/{nonexistent_id}/flyer"
    
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code == 404:
            response_data = response.json()
            if "Event not found" in response_data.get("detail", ""):
                print(f"   ✅ PASS: Non-existent event correctly handled")
                print(f"      - Status: {response.status_code}")
                print(f"      - Message: {response_data.get('detail')}")
                results["passed"] += 1
                results["details"].append("✅ Non-existent event handling - PASS")
            else:
                print(f"   ❌ FAIL: Wrong error message: {response_data.get('detail')}")
                results["failed"] += 1
                results["details"].append(f"❌ Non-existent event handling - Wrong error message")
        else:
            print(f"   ❌ FAIL: Expected 404, got {response.status_code}")
            print(f"      Response: {response.text[:200]}")
            results["failed"] += 1
            results["details"].append(f"❌ Non-existent event handling - Expected 404, got {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ FAIL: Exception - {e}")
        results["failed"] += 1
        results["details"].append(f"❌ Non-existent event handling - Exception: {e}")
    
    # Test 4: Recurring event flyer (if implemented)
    print("\n4. Testing recurring event flyer...")
    results["total_tests"] += 1
    
    # Test with a recurring event ID format (base_id__YYYYMMDD)
    recurring_id = f"{test_event_id}__20260415"
    url = f"{API_BASE}/events/{recurring_id}/flyer"
    
    try:
        response = requests.get(url, timeout=30)
        
        if response.status_code == 200:
            content_type = response.headers.get('content-type', '')
            if content_type == 'image/jpeg':
                content = response.content
                if len(content) > 3 and content[0] == 0xFF and content[1] == 0xD8 and content[2] == 0xFF:
                    size_kb = len(content) / 1024
                    print(f"   ✅ PASS: Recurring event flyer generated")
                    print(f"      - Status: {response.status_code}")
                    print(f"      - Content-Type: {content_type}")
                    print(f"      - Size: {size_kb:.1f} KB")
                    results["passed"] += 1
                    results["details"].append("✅ Recurring event flyer generation - PASS")
                else:
                    print(f"   ❌ FAIL: Invalid JPEG for recurring event")
                    results["failed"] += 1
                    results["details"].append("❌ Recurring event flyer generation - Invalid JPEG")
            else:
                print(f"   ❌ FAIL: Wrong content type for recurring event: {content_type}")
                results["failed"] += 1
                results["details"].append(f"❌ Recurring event flyer generation - Wrong content type")
        else:
            print(f"   ❌ FAIL: Recurring event flyer failed with {response.status_code}")
            print(f"      Response: {response.text[:200]}")
            results["failed"] += 1
            results["details"].append(f"❌ Recurring event flyer generation - HTTP {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ FAIL: Exception - {e}")
        results["failed"] += 1
        results["details"].append(f"❌ Recurring event flyer generation - Exception: {e}")
    
    return results

def main():
    """Run all flyer generation tests"""
    print(f"Backend API Testing - Event Flyer Generation")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test Event Flyer Generation API
    flyer_results = test_event_flyer_generation()
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    total_tests = flyer_results["total_tests"]
    total_passed = flyer_results["passed"]
    total_failed = flyer_results["failed"]
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_failed}")
    print(f"Success Rate: {(total_passed/total_tests*100):.1f}%")
    
    print("\nDetailed Results:")
    for detail in flyer_results["details"]:
        print(f"  {detail}")
    
    if total_failed > 0:
        print(f"\n❌ {total_failed} test(s) failed. See details above.")
        return 1
    else:
        print(f"\n✅ All {total_passed} tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())