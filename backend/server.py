from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, List

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError(
        "MONGO_URL environment variable is not set. "
        "Please configure it in Render dashboard with your MongoDB Atlas connection string: "
        "mongodb+srv://username:password@cluster.mongodb.net/servivizinhos?retryWrites=true&w=majority"
    )

try:
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    # Test connection
    client.admin.command('ping')
    db = client[os.environ.get('DB_NAME', 'servivizinhos')]
    logging.info("MongoDB connection successful")
except Exception as e:
    logging.error(f"MongoDB connection failed: {e}")
    raise RuntimeError(f"Failed to connect to MongoDB: {e}")

# Create the main app
app = FastAPI(title="AlloVoisins Clone API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Health check
@api_router.get("/")
async def root():
    return {"message": "AlloVoisins Clone API is running", "version": "1.0.0"}

# Import routers AFTER db is initialized to avoid circular imports
from routers import auth, users, demands, messages, reviews, categories

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(demands.router, prefix="/demands", tags=["demands"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting AlloVoisins Clone API...")
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.demands.create_index("userId")
    await db.demands.create_index("category")
    await db.messages.create_index("conversationId")
    await db.reviews.create_index("toUserId")
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("Database connection closed")