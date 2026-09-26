from fastapi import APIRouter, HTTPException, Depends, Query
from models import MessageCreate, MessageResponse
from auth_utils import get_current_user
from typing import List
from bson import ObjectId
from datetime import datetime
from server import db

router = APIRouter()

def get_conversation_id(user_id1: str, user_id2: str) -> str:
    """Generate consistent conversation ID from two user IDs"""
    sorted_ids = sorted([user_id1, user_id2])
    return f"{sorted_ids[0]}_{sorted_ids[1]}"

@router.get("/", response_model=List[MessageResponse])
async def get_messages(
    user_id: str = Depends(get_current_user),
    conversation_id: str = Query(None)
):
    if conversation_id:
        query = {"conversationId": conversation_id}
    else:
        query = {"$or": [{"fromUserId": user_id}, {"toUserId": user_id}]}
    
    messages_cursor = db.messages.find(query).sort("createdAt", -1).limit(100)
    messages = await messages_cursor.to_list(length=100)
    
    return [
        MessageResponse(
            id=str(msg["_id"]),
            conversationId=msg["conversationId"],
            fromUserId=msg["fromUserId"],
            toUserId=msg["toUserId"],
            demandId=msg.get("demandId"),
            message=msg["message"],
            read=msg.get("read", False),
            createdAt=msg["createdAt"]
        )
        for msg in messages
    ]

@router.post("/", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    user_id: str = Depends(get_current_user)
):
    conversation_id = get_conversation_id(user_id, message_data.toUserId)
    
    message_dict = {
        "conversationId": conversation_id,
        "fromUserId": user_id,
        "toUserId": message_data.toUserId,
        "demandId": message_data.demandId,
        "message": message_data.message,
        "read": False,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.messages.insert_one(message_dict)
    message_dict["_id"] = result.inserted_id
    
    return MessageResponse(
        id=str(message_dict["_id"]),
        conversationId=message_dict["conversationId"],
        fromUserId=message_dict["fromUserId"],
        toUserId=message_dict["toUserId"],
        demandId=message_dict.get("demandId"),
        message=message_dict["message"],
        read=message_dict["read"],
        createdAt=message_dict["createdAt"]
    )

@router.put("/{message_id}/read")
async def mark_as_read(
    message_id: str,
    user_id: str = Depends(get_current_user)
):
    result = await db.messages.update_one(
        {"_id": ObjectId(message_id), "toUserId": user_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"success": True, "message": "Message marked as read"}