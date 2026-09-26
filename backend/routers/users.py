from fastapi import APIRouter, HTTPException, Depends, Query
from models import UserResponse, UserUpdate
from auth_utils import get_current_user
from typing import List, Optional
from bson import ObjectId
from server import db

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, le=100)
):
    query = {}
    if category and category != "all":
        query["categories"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    users_cursor = db.users.find(query).limit(limit)
    users = await users_cursor.to_list(length=limit)
    
    return [
        UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            avatar=user.get("avatar"),
            location=user["location"],
            phone=user.get("phone"),
            isPremier=user.get("isPremier", False),
            rating=user.get("rating", 0.0),
            reviewCount=user.get("reviewCount", 0),
            categories=user.get("categories", []),
            createdAt=user["createdAt"]
        )
        for user in users
    ]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        avatar=user.get("avatar"),
        location=user["location"],
        phone=user.get("phone"),
        isPremier=user.get("isPremier", False),
        rating=user.get("rating", 0.0),
        reviewCount=user.get("reviewCount", 0),
        categories=user.get("categories", []),
        createdAt=user["createdAt"]
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user_id: str = Depends(get_current_user)
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        avatar=user.get("avatar"),
        location=user["location"],
        phone=user.get("phone"),
        isPremier=user.get("isPremier", False),
        rating=user.get("rating", 0.0),
        reviewCount=user.get("reviewCount", 0),
        categories=user.get("categories", []),
        createdAt=user["createdAt"]
    )