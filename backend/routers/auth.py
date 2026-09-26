from fastapi import APIRouter, HTTPException, Depends, status
from models import UserRegister, UserLogin, TokenResponse, UserResponse, PasswordResetRequest, PasswordResetConfirm
from auth_utils import get_password_hash, verify_password, create_access_token, get_current_user
from datetime import datetime
import random
import string
from server import db

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este email já está cadastrado"
        )
    
    # Create user
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_data.password)
    user_dict["avatar"] = f"https://i.pravatar.cc/150?u={user_data.email}"
    user_dict["isPremier"] = False
    user_dict["rating"] = 0.0
    user_dict["reviewCount"] = 0
    user_dict["categories"] = []
    user_dict["createdAt"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Create token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    # Prepare response
    user_response = UserResponse(
        id=str(user_dict["_id"]),
        name=user_dict["name"],
        email=user_dict["email"],
        avatar=user_dict["avatar"],
        location=user_dict["location"],
        phone=user_dict.get("phone"),
        isPremier=user_dict["isPremier"],
        rating=user_dict["rating"],
        reviewCount=user_dict["reviewCount"],
        categories=user_dict["categories"],
        createdAt=user_dict["createdAt"]
    )
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos"
        )
    
    # Create token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    # Prepare response
    user_response = UserResponse(
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
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def get_me(user_id: str = Depends(get_current_user)):
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
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

@router.post("/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Email não encontrado")
    
    code = ''.join(random.choices(string.digits, k=6))
    await db.password_resets.update_one(
        {"email": data.email},
        {"$set": {"email": data.email, "code": code, "createdAt": datetime.utcnow()}},
        upsert=True
    )
    return {"message": "Código de verificação enviado", "hint": f"Use o código: {code}"}

@router.post("/reset-password")
async def reset_password(data: PasswordResetConfirm):
    reset = await db.password_resets.find_one({"email": data.email, "code": data.code})
    if not reset:
        raise HTTPException(status_code=400, detail="Código inválido ou expirado")
    
    hashed = get_password_hash(data.new_password)
    await db.users.update_one({"email": data.email}, {"$set": {"password": hashed}})
    await db.password_resets.delete_one({"email": data.email})
    return {"message": "Senha alterada com sucesso"}