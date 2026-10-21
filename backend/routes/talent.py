from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import logging

from database import db
from helpers import _sid, _isodate, send_push_notification

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Helper Functions ====================

def talent_helper(talent, include_view_count: bool = False) -> dict:
    """Convert talent document to API response"""
    result = {
        "id": str(talent["_id"]),
        "userId": _sid(talent.get("userId")),
        "category": talent.get("category", "other"),
        "businessName": talent.get("businessName", ""),
        "displayName": talent.get("displayName", ""),
        "headline": talent.get("headline", ""),
        "bio": talent.get("bio", ""),
        "serviceTags": talent.get("serviceTags", []),
        "location": talent.get("location", ""),
        "serviceArea": talent.get("serviceArea", ""),
        "availability": talent.get("availability", "available"),
        "photos": talent.get("photos", []),
        "videoUrl": talent.get("videoUrl", ""),
        "contactEmail": talent.get("contactEmail", ""),
        "contactPhone": talent.get("contactPhone", ""),
        "externalLink": talent.get("externalLink", ""),
        "socialLinks": talent.get("socialLinks", {}),
        "isVerified": talent.get("isVerified", False),
        "isFeatured": talent.get("isFeatured", False),
        "isPinned": talent.get("isPinned", False),
        "isActive": talent.get("isActive", True),
        "setupComplete": talent.get("setupComplete", False),
        "profileCompletion": talent.get("profileCompletion", 0),
        "createdAt": _isodate(talent.get("createdAt")),
        "updatedAt": _isodate(talent.get("updatedAt")),
        
        # ===== NEW CUSTOMIZATION OPTIONS =====
        # Theme & Colors
        "theme": talent.get("theme", {
            "primaryColor": "#FF5500",
            "backgroundColor": "#000000",
            "cardColor": "#1a1a1a",
            "textColor": "#ffffff",
            "accentColor": "#FF5500",
            "gradientStart": "#1a1a1a",
            "gradientEnd": "#000000",
            "useGradient": False,
        }),
        
        # Layout Preferences
        "layout": talent.get("layout", {
            "photoStyle": "carousel",  # carousel, grid, stacked
            "showBioFirst": False,
            "sectionOrder": ["photos", "about", "services", "contact"],
            "headerStyle": "banner",  # banner, minimal, centered
        }),
        
        # Banner/Branding
        "bannerImage": talent.get("bannerImage", ""),
        "logoImage": talent.get("logoImage", ""),
        
        # Extended Profile Info
        "yearsExperience": talent.get("yearsExperience", ""),
        "languages": talent.get("languages", []),
        "equipment": talent.get("equipment", []),
        "specialties": talent.get("specialties", []),
        
        # Pricing & Booking
        "showPricing": talent.get("showPricing", False),
        "priceRange": talent.get("priceRange", {
            "min": "",
            "max": "",
            "unit": "hour",  # hour, day, project, contact
            "currency": "USD",
        }),
        "bookingLink": talent.get("bookingLink", ""),
        "bookingButtonText": talent.get("bookingButtonText", "Book Now"),
        
        # Contact Preferences
        "contactPreferences": talent.get("contactPreferences", {
            "showEmail": True,
            "showPhone": True,
            "preferredMethod": "message",  # message, email, phone, booking
            "responseTime": "",  # "Within 24 hours", etc.
        }),
        
        # Services List (detailed)
        "services": talent.get("services", []),
        # Each service: { name, description, price, duration }
        
        # Testimonials
        "testimonials": talent.get("testimonials", []),
        # Each: { name, text, date, rating }
        
        # Portfolio/Past Work
        "portfolioLinks": talent.get("portfolioLinks", []),
        # Each: { title, url, thumbnail }
        
        # Achievements
        "achievements": talent.get("achievements", []),
        # Each: { title, year, description }
        
        # FAQ
        "faqs": talent.get("faqs", []),
        # Each: { question, answer }
        
        # Custom Sections
        "customSections": talent.get("customSections", []),
        # Each: { title, content, type: 'text' | 'list' | 'gallery' }
        
        # Call to Action
        "ctaButton": talent.get("ctaButton", {
            "enabled": False,
            "text": "Get in Touch",
            "link": "",
            "style": "primary",  # primary, secondary, outline
        }),
        
        # Profile Completion
        "profileCompletion": talent.get("profileCompletion", 0),
    }
    
    # Only include view count if requested (for talent viewing their own profile)
    if include_view_count:
        result["viewCount"] = talent.get("viewCount", 0)
    
    return result


def invite_helper(invite) -> dict:
    """Convert invite document to API response"""
    return {
        "id": str(invite["_id"]),
        "code": invite.get("code", ""),
        "email": invite.get("email", ""),
        "invitedBy": _sid(invite.get("invitedBy")),
        "status": invite.get("status", "pending"),
        "expiresAt": _isodate(invite.get("expiresAt")),
        "acceptedBy": _sid(invite.get("acceptedBy")),
        "acceptedAt": _isodate(invite.get("acceptedAt")),
        "createdAt": _isodate(invite.get("createdAt")),
    }


# ==================== Admin Invite Endpoints ====================

@router.post("/admin/talent/invite")
async def create_talent_invite(
    admin_id: str = Query(...),
    email: str = Query(None),
    generate_code: bool = Query(False)
):
    """
    Admin creates a talent invite.
    - If email provided: sends invite to specific email
    - If generate_code=True: creates a shareable invite code
    - Can do both simultaneously
    """
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid admin ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not email and not generate_code:
        raise HTTPException(status_code=400, detail="Must provide email or set generate_code=True")
    
    # Generate unique invite code
    invite_code = secrets.token_urlsafe(8)  # 11 character code
    
    invite_doc = {
        "code": invite_code,
        "email": email.lower().strip() if email else None,
        "invitedBy": admin_id,
        "status": "pending",
        "expiresAt": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "createdAt": datetime.utcnow().isoformat(),
    }
    
    # Check if email already has pending invite
    if email:
        existing = await db.talent_invites.find_one({
            "email": email.lower().strip(),
            "status": "pending"
        })
        if existing:
            raise HTTPException(status_code=400, detail="Pending invite already exists for this email")
    
    result = await db.talent_invites.insert_one(invite_doc)
    created_invite = await db.talent_invites.find_one({"_id": result.inserted_id})
    
    # Send the invite email if an email address was provided
    email_sent = False
    if email:
        try:
            from email_service import send_email, build_talent_invite_email
            subject, html = build_talent_invite_email(invite_code)
            email_id = await send_email(to=email, subject=subject, html=html)
            email_sent = bool(email_id)
        except Exception as e:
            logger.error(f"Failed to send talent invite email: {e}")
    
    msg = f"Invite created. Code: {invite_code}"
    if email:
        msg += f" for {email}" + (" (email sent)" if email_sent else " (email NOT sent — check logs)")
    else:
        msg += " (shareable)"
    
    return {
        "success": True,
        "invite": invite_helper(created_invite),
        "emailSent": email_sent,
        "message": msg
    }


@router.get("/admin/talent/invites")
async def get_talent_invites(
    admin_id: str = Query(...),
    status: str = Query(None)
):
    """Get all talent invites (admin only)"""
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid admin ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["status"] = status
    
    invites = await db.talent_invites.find(query).sort("createdAt", -1).to_list(500)
    
    return {
        "invites": [invite_helper(inv) for inv in invites],
        "count": len(invites)
    }


@router.post("/admin/talent/invite/{invite_id}/resend")
async def resend_talent_invite(invite_id: str, admin_id: str = Query(...)):
    """Resend the invite email for a pending invite (admin only)."""
    if not ObjectId.is_valid(admin_id) or not ObjectId.is_valid(invite_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    invite = await db.talent_invites.find_one({"_id": ObjectId(invite_id)})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    if invite.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending invites can be resent")
    if not invite.get("email"):
        raise HTTPException(status_code=400, detail="This invite has no email address to resend to")
    
    email_sent = False
    try:
        from email_service import send_email, build_talent_invite_email
        subject, html = build_talent_invite_email(invite["code"])
        email_id = await send_email(to=invite["email"], subject=subject, html=html)
        email_sent = bool(email_id)
    except Exception as e:
        logger.error(f"Failed to resend talent invite email: {e}")
    
    return {
        "success": email_sent,
        "emailSent": email_sent,
        "message": f"Email resent to {invite['email']}" if email_sent else "Email could NOT be sent — check logs"
    }


@router.delete("/admin/talent/invite/{invite_id}")
async def delete_talent_invite(invite_id: str, admin_id: str = Query(...)):
    """Delete/revoke a talent invite"""
    if not ObjectId.is_valid(admin_id) or not ObjectId.is_valid(invite_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.talent_invites.delete_one({"_id": ObjectId(invite_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    return {"success": True, "message": "Invite deleted"}


# ==================== Invite Validation & Acceptance ====================

@router.get("/talent/invite/{code}")
async def validate_invite_code(code: str):
    """Validate an invite code (public endpoint)"""
    invite = await db.talent_invites.find_one({"code": code})
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    if invite.get("status") != "pending":
        raise HTTPException(status_code=400, detail=f"Invite has been {invite.get('status', 'used')}")
    
    # Check expiry
    expires_at = invite.get("expiresAt")
    if expires_at:
        try:
            exp_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.utcnow() > exp_date.replace(tzinfo=None):
                await db.talent_invites.update_one(
                    {"_id": invite["_id"]},
                    {"$set": {"status": "expired"}}
                )
                raise HTTPException(status_code=400, detail="Invite has expired")
        except ValueError:
            pass
    
    return {
        "valid": True,
        "email": invite.get("email"),
        "expiresAt": invite.get("expiresAt")
    }


@router.post("/talent/invite/{code}/accept")
async def accept_talent_invite(
    code: str,
    user_id: str = Query(...)
):
    """Accept invite and create talent profile placeholder"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    # Validate invite
    invite = await db.talent_invites.find_one({"code": code, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or used invite code")
    
    # Check expiry
    expires_at = invite.get("expiresAt")
    if expires_at:
        try:
            exp_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.utcnow() > exp_date.replace(tzinfo=None):
                await db.talent_invites.update_one(
                    {"_id": invite["_id"]},
                    {"$set": {"status": "expired"}}
                )
                raise HTTPException(status_code=400, detail="Invite has expired")
        except ValueError:
            pass
    
    # Check if user already has a talent profile
    existing_profile = await db.talent_profiles.find_one({"userId": user_id})
    if existing_profile:
        raise HTTPException(status_code=400, detail="User already has a talent profile")
    
    # Get user info
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create talent profile placeholder
    profile_doc = {
        "userId": user_id,
        "inviteId": str(invite["_id"]),
        "category": "other",  # Default, user will update
        "businessName": "",
        "displayName": user.get("name", ""),
        "bio": "",
        "serviceTags": [],
        "location": "",
        "serviceArea": "",
        "availability": "available",
        "photos": [],
        "videoUrl": "",
        "contactEmail": user.get("email", ""),
        "contactPhone": "",
        "externalLink": "",
        "socialLinks": {
            "instagram": "",
            "tiktok": "",
            "youtube": "",
            "facebook": ""
        },
        "isVerified": False,
        "isFeatured": False,
        "isPinned": False,
        "viewCount": 0,
        "isActive": False,  # Not active until they complete setup
        "setupComplete": False,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    
    result = await db.talent_profiles.insert_one(profile_doc)
    
    # Mark invite as accepted
    await db.talent_invites.update_one(
        {"_id": invite["_id"]},
        {"$set": {
            "status": "accepted",
            "acceptedBy": user_id,
            "acceptedAt": datetime.utcnow().isoformat()
        }}
    )
    
    # Mark user as talent
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"isTalent": True, "talentProfileId": str(result.inserted_id)}}
    )
    
    created_profile = await db.talent_profiles.find_one({"_id": result.inserted_id})
    
    return {
        "success": True,
        "message": "Invite accepted! Complete your talent profile to go live.",
        "profile": talent_helper(created_profile, include_view_count=True)
    }


# ==================== Talent Profile Endpoints ====================

@router.get("/talent")
async def get_all_talent(
    category: str = Query(None),
    search: str = Query(None),
    sort_by: str = Query("newest"),  # newest, most_viewed
    user_id: str = Query(None)  # To check favorites
):
    """Get all active talent profiles with filters"""
    query = {"isActive": True, "setupComplete": True}
    
    if category and category != "all":
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"businessName": {"$regex": search, "$options": "i"}},
            {"displayName": {"$regex": search, "$options": "i"}},
            {"serviceTags": {"$regex": search, "$options": "i"}},
            {"bio": {"$regex": search, "$options": "i"}},
        ]
    
    # Determine sort order
    if sort_by == "most_viewed":
        sort_field = [("viewCount", -1)]
    else:  # newest
        sort_field = [("createdAt", -1)]
    
    # Get pinned first, then featured, then rest
    pinned = await db.talent_profiles.find({**query, "isPinned": True}).sort(sort_field).to_list(100)
    featured = await db.talent_profiles.find({**query, "isFeatured": True, "isPinned": False}).sort(sort_field).to_list(100)
    regular = await db.talent_profiles.find({**query, "isFeatured": False, "isPinned": False}).sort(sort_field).to_list(500)
    
    all_talent = pinned + featured + regular
    
    # Get user's favorites if user_id provided
    user_favorites = set()
    if user_id and ObjectId.is_valid(user_id):
        favorites = await db.talent_favorites.find({"userId": user_id}).to_list(500)
        user_favorites = {fav["talentId"] for fav in favorites}
    
    result = []
    for talent in all_talent:
        t = talent_helper(talent)
        t["isFavorited"] = str(talent["_id"]) in user_favorites
        result.append(t)
    
    return {
        "talent": result,
        "count": len(result),
        "pinnedCount": len(pinned),
        "featuredCount": len(featured)
    }


@router.get("/talent/my-profile")
async def get_my_talent_profile(user_id: str = Query(...)):
    """Get current user's talent profile (includes view count)"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    profile = await db.talent_profiles.find_one({"userId": user_id})
    
    if not profile:
        raise HTTPException(status_code=404, detail="No talent profile found")
    
    return talent_helper(profile, include_view_count=True)


@router.get("/talent/{talent_id}")
async def get_talent_profile(
    talent_id: str,
    user_id: str = Query(None),
    is_owner: bool = Query(False)
):
    """Get a specific talent profile and increment view count"""
    if not ObjectId.is_valid(talent_id):
        raise HTTPException(status_code=400, detail="Invalid talent ID")
    
    profile = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Talent profile not found")
    
    # Increment view count (unless owner is viewing)
    if not is_owner:
        await db.talent_profiles.update_one(
            {"_id": ObjectId(talent_id)},
            {"$inc": {"viewCount": 1}}
        )
    
    # Check if user has favorited
    is_favorited = False
    if user_id and ObjectId.is_valid(user_id):
        fav = await db.talent_favorites.find_one({"userId": user_id, "talentId": talent_id})
        is_favorited = fav is not None
    
    result = talent_helper(profile, include_view_count=is_owner)
    result["isFavorited"] = is_favorited
    
    return result


@router.put("/talent/{talent_id}")
async def update_talent_profile(
    talent_id: str,
    user_id: str = Query(...),
    profile_data: dict = None
):
    """Update talent profile (owner only)"""
    if not ObjectId.is_valid(talent_id) or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    profile = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    
    if not profile:
        raise HTTPException(status_code=404, detail="Talent profile not found")
    
    if profile.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this profile")
    
    if not profile_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # The frontend sends the body wrapped as {"profile_data": {...}}. Because this
    # param is a plain dict, FastAPI assigns the ENTIRE request body to it, so unwrap.
    if 'profile_data' in profile_data and isinstance(profile_data['profile_data'], dict):
        profile_data = profile_data['profile_data']
    
    # Allowed fields for talent to update
    allowed_fields = [
        # Basic info
        "category", "businessName", "displayName", "headline", "bio", "serviceTags",
        "location", "serviceArea", "availability", "photos", "videoUrl",
        "contactEmail", "contactPhone", "externalLink", "socialLinks", "isActive",
        
        # Theme & Colors
        "theme",
        
        # Layout Preferences
        "layout",
        
        # Banner/Branding
        "bannerImage", "logoImage",
        
        # Extended Profile Info
        "yearsExperience", "languages", "equipment", "specialties",
        
        # Pricing & Booking
        "showPricing", "priceRange", "bookingLink", "bookingButtonText",
        
        # Contact Preferences
        "contactPreferences",
        
        # Services List (detailed)
        "services",
        
        # Testimonials
        "testimonials",
        
        # Portfolio/Past Work
        "portfolioLinks",
        
        # Achievements
        "achievements",
        
        # FAQ
        "faqs",
        
        # Custom Sections
        "customSections",
        
        # Call to Action
        "ctaButton",
    ]
    
    update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
    
    # Validate photos limit
    if "photos" in update_data and len(update_data["photos"]) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 photos allowed")
    
    # Validate category
    valid_categories = ["photographer", "model", "dancer", "other"]
    if "category" in update_data and update_data["category"] not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(valid_categories)}")
    
    # Validate availability
    valid_availability = ["available", "booked", "taking_bookings"]
    if "availability" in update_data and update_data["availability"] not in valid_availability:
        raise HTTPException(status_code=400, detail=f"Availability must be one of: {', '.join(valid_availability)}")
    
    # Check if setup is complete (has required fields)
    current_data = {**profile, **update_data}
    setup_complete = bool(
        current_data.get("category") and
        current_data.get("displayName") and
        current_data.get("bio") and
        len(current_data.get("photos", [])) > 0
    )
    
    # Calculate profile completion percentage
    completion_items = [
        bool(current_data.get("displayName")),
        bool(current_data.get("bio")),
        len(current_data.get("photos", [])) > 0,
        bool(current_data.get("category")),
        bool(current_data.get("location")),
        bool(current_data.get("contactEmail") or current_data.get("contactPhone")),
        len(current_data.get("serviceTags", [])) > 0,
        bool(current_data.get("headline")),
        bool(current_data.get("bannerImage")),
        any(current_data.get("socialLinks", {}).values()),
        len(current_data.get("services", [])) > 0,
        bool(current_data.get("videoUrl")),
        bool(current_data.get("externalLink") or current_data.get("bookingLink")),
        len(current_data.get("testimonials", [])) > 0,
        bool(current_data.get("yearsExperience")),
    ]
    profile_completion = int((sum(completion_items) / len(completion_items)) * 100)
    
    update_data["setupComplete"] = setup_complete
    update_data["profileCompletion"] = profile_completion
    update_data["updatedAt"] = datetime.utcnow().isoformat()
    
    # If setup is complete and isActive not explicitly set, activate
    if setup_complete and "isActive" not in update_data and not profile.get("setupComplete"):
        update_data["isActive"] = True
    
    await db.talent_profiles.update_one(
        {"_id": ObjectId(talent_id)},
        {"$set": update_data}
    )
    
    updated_profile = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    
    return {
        "success": True,
        "message": "Profile updated" + (" and now live!" if update_data.get("isActive") and not profile.get("isActive") else ""),
        "profile": talent_helper(updated_profile, include_view_count=True)
    }


# ==================== Favorites ====================

@router.post("/talent/{talent_id}/favorite")
async def toggle_talent_favorite(talent_id: str, user_id: str = Query(...)):
    """Toggle favorite status for a talent"""
    if not ObjectId.is_valid(talent_id) or not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Check talent exists
    talent = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    # Check if already favorited
    existing = await db.talent_favorites.find_one({
        "userId": user_id,
        "talentId": talent_id
    })
    
    if existing:
        # Remove favorite
        await db.talent_favorites.delete_one({"_id": existing["_id"]})
        return {"success": True, "favorited": False, "message": "Removed from favorites"}
    else:
        # Add favorite
        await db.talent_favorites.insert_one({
            "userId": user_id,
            "talentId": talent_id,
            "createdAt": datetime.utcnow().isoformat()
        })
        return {"success": True, "favorited": True, "message": "Added to favorites"}


@router.get("/talent/favorites/{user_id}")
async def get_user_talent_favorites(user_id: str):
    """Get all talent favorited by a user"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    favorites = await db.talent_favorites.find({"userId": user_id}).sort("createdAt", -1).to_list(500)
    
    talent_ids = [ObjectId(fav["talentId"]) for fav in favorites if ObjectId.is_valid(fav["talentId"])]
    
    if not talent_ids:
        return {"talent": [], "count": 0}
    
    talent_profiles = await db.talent_profiles.find({
        "_id": {"$in": talent_ids},
        "isActive": True
    }).to_list(500)
    
    result = [talent_helper(t) for t in talent_profiles]
    for t in result:
        t["isFavorited"] = True
    
    return {"talent": result, "count": len(result)}


# ==================== Admin Controls ====================

@router.put("/admin/talent/{talent_id}/pin")
async def toggle_talent_pin(talent_id: str, admin_id: str = Query(...)):
    """Toggle pinned status (admin only)"""
    if not ObjectId.is_valid(talent_id) or not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    talent = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    new_status = not talent.get("isPinned", False)
    await db.talent_profiles.update_one(
        {"_id": ObjectId(talent_id)},
        {"$set": {"isPinned": new_status, "updatedAt": datetime.utcnow().isoformat()}}
    )
    
    return {"success": True, "isPinned": new_status}


@router.put("/admin/talent/{talent_id}/feature")
async def toggle_talent_feature(talent_id: str, admin_id: str = Query(...)):
    """Toggle featured status (admin only)"""
    if not ObjectId.is_valid(talent_id) or not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    talent = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    new_status = not talent.get("isFeatured", False)
    await db.talent_profiles.update_one(
        {"_id": ObjectId(talent_id)},
        {"$set": {"isFeatured": new_status, "updatedAt": datetime.utcnow().isoformat()}}
    )
    
    return {"success": True, "isFeatured": new_status}


@router.put("/admin/talent/{talent_id}/verify")
async def toggle_talent_verify(talent_id: str, admin_id: str = Query(...)):
    """Toggle verified status (admin only)"""
    if not ObjectId.is_valid(talent_id) or not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    talent = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    new_status = not talent.get("isVerified", False)
    await db.talent_profiles.update_one(
        {"_id": ObjectId(talent_id)},
        {"$set": {"isVerified": new_status, "updatedAt": datetime.utcnow().isoformat()}}
    )
    
    # Notify talent of verification
    if new_status:
        user_id = talent.get("userId")
        if user_id:
            notification = {
                "userId": user_id,
                "type": "talent_verified",
                "title": "🎉 You're Verified!",
                "message": "Congratulations! Your talent profile has been verified by StreetMotion.",
                "isRead": False,
                "createdAt": datetime.utcnow().isoformat()
            }
            await db.notifications.insert_one(notification)
            
            # Send push if available
            user = await db.users.find_one({"_id": ObjectId(user_id)})
            if user and user.get("pushToken"):
                await send_push_notification(
                    user["pushToken"],
                    notification["title"],
                    notification["message"],
                    {"type": "talent_verified"}
                )
    
    return {"success": True, "isVerified": new_status}


@router.get("/admin/talent/all")
async def admin_get_all_talent(admin_id: str = Query(...)):
    """Get all talent profiles including inactive (admin only)"""
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid admin ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_talent = await db.talent_profiles.find({}).sort("createdAt", -1).to_list(1000)
    
    return {
        "talent": [talent_helper(t, include_view_count=True) for t in all_talent],
        "count": len(all_talent)
    }


@router.delete("/admin/talent/{talent_id}")
async def admin_delete_talent(talent_id: str, admin_id: str = Query(...)):
    """Delete a talent profile (admin only)"""
    if not ObjectId.is_valid(talent_id) or not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    admin = await db.users.find_one({"_id": ObjectId(admin_id)})
    if not admin or not admin.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    talent = await db.talent_profiles.find_one({"_id": ObjectId(talent_id)})
    if not talent:
        raise HTTPException(status_code=404, detail="Talent not found")
    
    # Remove talent flag from user
    user_id = talent.get("userId")
    if user_id and ObjectId.is_valid(user_id):
        await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$unset": {"isTalent": "", "talentProfileId": ""}}
        )
    
    # Delete favorites
    await db.talent_favorites.delete_many({"talentId": talent_id})
    
    # Delete profile
    await db.talent_profiles.delete_one({"_id": ObjectId(talent_id)})
    
    return {"success": True, "message": "Talent profile deleted"}


# ==================== Check User Talent Status ====================

@router.get("/talent/check/{user_id}")
async def check_user_talent_status(user_id: str):
    """Check if user is talent and get their profile status"""
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_talent = user.get("isTalent", False)
    profile = None
    
    if is_talent:
        profile_doc = await db.talent_profiles.find_one({"userId": user_id})
        if profile_doc:
            profile = talent_helper(profile_doc, include_view_count=True)
    
    return {
        "isTalent": is_talent,
        "hasProfile": profile is not None,
        "setupComplete": profile.get("setupComplete", False) if profile else False,
        "isActive": profile.get("isActive", False) if profile else False,
        "profile": profile
    }
