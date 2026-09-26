from fastapi import APIRouter, HTTPException, Depends, Query
from models import DemandCreate, DemandUpdate, DemandResponse, DemandResponseCreate, DemandResponseModel
from auth_utils import get_current_user
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from server import db

router = APIRouter()

@router.get("/", response_model=List[DemandResponse])
async def get_demands(
    category: Optional[str] = Query(None),
    status: str = Query("active"),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0)
):
    query = {"status": status}
    if category and category != "all":
        query["category"] = category
    
    # Use projection to fetch only needed fields (smaller payload, faster)
    projection = {
        "title": 1,
        "description": 1,
        "category": 1,
        "budget": 1,
        "location": 1,
        "photos": 1,
        "likes": 1,
        "recommends": 1,
        "isPro": 1,
        "status": 1,
        "createdAt": 1,
        "userId": 1
    }
    
    demands_cursor = db.demands.find(query, projection).sort("createdAt", -1).skip(skip).limit(limit)
    demands = await demands_cursor.to_list(length=limit)
    
    # Batch fetch response counts to avoid N+1 queries
    demand_ids = [str(d["_id"]) for d in demands]
    response_counts = {}
    if demand_ids:
        pipeline = [
            {"$match": {"demandId": {"$in": demand_ids}}},
            {"$group": {"_id": "$demandId", "count": {"$sum": 1}}}
        ]
        async for doc in db.demand_responses.aggregate(pipeline):
            response_counts[doc["_id"]] = doc["count"]
    
    result = []
    for demand in demands:
        demand_id = str(demand["_id"])
        result.append(DemandResponse(
            id=demand_id,
            userId=demand["userId"],
            title=demand["title"],
            description=demand["description"],
            category=demand["category"],
            budget=demand.get("budget"),
            location=demand["location"],
            photos=demand.get("photos", []),
            likes=demand.get("likes", 0),
            recommends=demand.get("recommends", 0),
            responses=response_counts.get(demand_id, 0),
            isPro=demand.get("isPro", False),
            status=demand.get("status", "active"),
            createdAt=demand["createdAt"]
        ))
    
    return result

@router.post("/", response_model=DemandResponse)
async def create_demand(
    demand_data: DemandCreate,
    user_id: str = Depends(get_current_user)
):
    demand_dict = demand_data.dict()
    demand_dict["userId"] = user_id
    demand_dict["likes"] = 0
    demand_dict["recommends"] = 0
    demand_dict["status"] = "active"
    demand_dict["createdAt"] = datetime.utcnow()
    
    result = await db.demands.insert_one(demand_dict)
    demand_dict["_id"] = result.inserted_id
    
    return DemandResponse(
        id=str(demand_dict["_id"]),
        userId=demand_dict["userId"],
        title=demand_dict["title"],
        description=demand_dict["description"],
        category=demand_dict["category"],
        budget=demand_dict.get("budget"),
        location=demand_dict["location"],
        photos=demand_dict.get("photos", []),
        likes=demand_dict["likes"],
        recommends=demand_dict["recommends"],
        responses=0,
        isPro=demand_dict.get("isPro", False),
        status=demand_dict["status"],
        createdAt=demand_dict["createdAt"]
    )

@router.get("/{demand_id}", response_model=DemandResponse)
async def get_demand(demand_id: str):
    demand = await db.demands.find_one({"_id": ObjectId(demand_id)})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    response_count = await db.demand_responses.count_documents({"demandId": demand_id})
    
    return DemandResponse(
        id=str(demand["_id"]),
        userId=demand["userId"],
        title=demand["title"],
        description=demand["description"],
        category=demand["category"],
        budget=demand.get("budget"),
        location=demand["location"],
        photos=demand.get("photos", []),
        likes=demand.get("likes", 0),
        recommends=demand.get("recommends", 0),
        responses=response_count,
        isPro=demand.get("isPro", False),
        status=demand.get("status", "active"),
        createdAt=demand["createdAt"]
    )

@router.post("/{demand_id}/like")
async def like_demand(demand_id: str, user_id: str = Depends(get_current_user)):
    result = await db.demands.update_one(
        {"_id": ObjectId(demand_id)},
        {"$inc": {"likes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demand not found")
    return {"success": True, "message": "Demand liked"}

@router.post("/{demand_id}/recommend")
async def recommend_demand(demand_id: str, user_id: str = Depends(get_current_user)):
    result = await db.demands.update_one(
        {"_id": ObjectId(demand_id)},
        {"$inc": {"recommends": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demand not found")
    return {"success": True, "message": "Demand recommended"}

@router.post("/{demand_id}/respond", response_model=DemandResponseModel)
async def respond_to_demand(
    demand_id: str,
    response_data: DemandResponseCreate,
    user_id: str = Depends(get_current_user)
):
    # Check if demand exists
    demand = await db.demands.find_one({"_id": ObjectId(demand_id)})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    
    # Create response
    response_dict = {
        "demandId": demand_id,
        "userId": user_id,
        "message": response_data.message,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.demand_responses.insert_one(response_dict)
    response_dict["_id"] = result.inserted_id
    
    return DemandResponseModel(
        id=str(response_dict["_id"]),
        demandId=response_dict["demandId"],
        userId=response_dict["userId"],
        message=response_dict["message"],
        createdAt=response_dict["createdAt"]
    )

@router.delete("/{demand_id}")
async def delete_demand(demand_id: str, user_id: str = Depends(get_current_user)):
    demand = await db.demands.find_one({"_id": ObjectId(demand_id)})
    if not demand:
        raise HTTPException(status_code=404, detail="Demand not found")
    if demand["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.demands.delete_one({"_id": ObjectId(demand_id)})
    return {"success": True, "message": "Demand deleted"}