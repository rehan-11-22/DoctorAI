from fastapi import FastAPI, UploadFile, Form, HTTPException, File
from pydantic import BaseModel
from typing import List, Optional
import openai
import json
from utils import encode_image, process_image_analysis
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from openai import OpenAI
from fastapi.staticfiles import StaticFiles
from pymongo import MongoClient
from datetime import datetime
import uuid
import os
from bson.objectid import ObjectId
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

# ---------------- SETUP OPENAI ----------------
from dotenv import load_dotenv
import os
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OpenAI API key not found. Please set it in .env file.")

# ---------------- Cloudinary Setup ----------------
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# ---------------- FASTAPI ----------------
app = FastAPI(title="Doctor AI API")


# Add CORS middleware here (before your endpoints)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class AnalyzeAndChatRequest(BaseModel):
    user_query: Optional[str] = None
    chat_history: Optional[List[dict]] = []


# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# MongoDB Setup
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client_mongo = MongoClient(MONGODB_URI)
db = client_mongo["doctor_ai"]
medical_records = db["medical_records"]
chats_collection = db["chat_conversations"]




# ------ New API Endpoints ------
@app.post("/analyze_and_store")
async def analyze_and_store(
    file: UploadFile = File(..., description="Medical image to analyze"),
    patient_id: str = Form(..., description="Patient identifier"),
    questions: str = Form(default="[]", description="JSON string of questions/answers"),
    diagnosis: str = Form(None),
    danger_level: str = Form(None)
):
    """
    Analyze medical image and save record to MongoDB with Cloudinary URL
    Questions are optional (can be empty array)
    """
    try:
        # Parse questions (empty array is allowed)
        try:
            questions_list = json.loads(questions)
            if not isinstance(questions_list, list):
                raise ValueError("Questions must be a JSON array")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid questions format: {str(e)}")

        # Read and process image
        image_data = await file.read()
        base64_image = encode_image(image_data)
        diagnosis_result = process_image_analysis(base64_image)

        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            image_data,
            folder="doctor_ai/",
            public_id=f"{uuid.uuid4()}",
            overwrite=True,
            resource_type="auto"
        )
        
        # Get the secure URL
        image_url = upload_result.get('secure_url')

        # Create MongoDB record
        record = {
            "patient_id": patient_id,
            "image_url": image_url,
            "cloudinary_public_id": upload_result.get('public_id'),
            "diagnosis": diagnosis_result,
            "danger_level": int(danger_level) if danger_level else 0,  # Add danger_level
            "questions": questions_list,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

        # Insert record
        result = medical_records.insert_one(record)
        
        return {
            "status": "success",
            "record_id": str(result.inserted_id),
            "image_url": image_url,
            "diagnosis": diagnosis_result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/records/{patient_id}")
async def get_records(patient_id: str):
    """Get all records for a specific patient"""
    records = list(medical_records.find({"patient_id": patient_id}, {"_id": 0}))
    return {"status": "success", "records": records}

# -------------- save chat and get chat -------

class ChatMessage(BaseModel):
    userId: str
    question: str
    answer: str
    isDeleted: bool = False
    timestamp: datetime = datetime.now()

@app.post("/chats")
async def save_chat(chat: ChatMessage):
    """
    Save a chat conversation with question and answer
    - userId: ID of the user who had the conversation
    - question: The user's question
    - answer: The AI's response
    - isDeleted: Boolean flag for soft deletion (default: False)
    """
    try:
        # Convert the Pydantic model to a dictionary
        chat_dict = chat.dict()
        
        # Insert into MongoDB
        result = chats_collection.insert_one(chat_dict)
        
        return {
            "status": "success",
            "message": "Chat saved successfully",
            "chatId": str(result.inserted_id)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats/{user_id}")
async def get_user_chats(user_id: str, include_deleted: bool = False):
    """
    Get all chats for a specific user
    - user_id: The user ID to fetch chats for
    - include_deleted: Whether to include deleted chats (default: False)
    """
    try:
        # Build query based on include_deleted parameter
        query = {"userId": user_id}
        if not include_deleted:
            query["isDeleted"] = False
            
        # Retrieve chats from MongoDB
        chats = list(chats_collection.find(query, {"_id": 0}))
        
        return {
            "status": "success",
            "chats": chats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/chats/{chat_id}/delete")
async def soft_delete_chat(chat_id: str):
    """
    Soft delete a chat by setting isDeleted to True
    - chat_id: The MongoDB ID of the chat to mark as deleted
    """
    try:
        # Update the chat document
        result = chats_collection.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"isDeleted": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
            
        return {
            "status": "success",
            "message": "Chat marked as deleted"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ------ API Endpoints ------
@app.post("/analyze_and_chat")
async def analyze_and_chat(
    file: UploadFile = File(None, media_type=["image/jpeg", "image/png" , "image/jpg"]),# Optional file upload
    user_query: str = Form(None),   # Optional text query
    chat_history: str = Form("[]")  # JSON string
):
    try:
        # Parse inputs
        history = json.loads(chat_history) if chat_history else []
        
        # Process image if provided
        diagnosis = None
        if file and file.content_type.startswith('image/'):
            image_data = await file.read()
            base64_image = encode_image(image_data)
            diagnosis = process_image_analysis(base64_image)
            history.append({"role": "assistant", "content": diagnosis})
        
        # Process text query if provided
        reply = None
        if user_query:
            history.append({"role": "user", "content": user_query})
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=history,
                max_tokens=500,
                temperature=0.2,
            )
            reply = response.choices[0].message.content
            history.append({"role": "assistant", "content": reply})
        
        return {
            "diagnosis": diagnosis,
            "reply": reply,
            "chat_history": history
        }
    
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid chat_history format")
    except Exception as e:
        raise HTTPException(500, str(e))