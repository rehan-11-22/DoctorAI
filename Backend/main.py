from fastapi import FastAPI, UploadFile, Form, HTTPException, File
from pydantic import BaseModel
from typing import List, Optional
import json
import base64
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient
from datetime import datetime
import uuid
import os
from bson.objectid import ObjectId

# Load environment variables
load_dotenv()

# ---------------- UTILITY FUNCTIONS ----------------
def encode_image(image_data):
    """Convert image bytes to base64 string"""
    return base64.b64encode(image_data).decode('utf-8')

def process_image_analysis(base64_image):
    """Analyze medical image using OpenAI Vision API"""
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "As a medical AI assistant, please analyze this medical image and provide a detailed diagnosis. Include observations about any abnormalities, potential conditions, and recommendations."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=500
        )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error analyzing image: {str(e)}"

# ---------------- SETUP OPENAI ----------------
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OpenAI API key not found. Please set OPENAI_API_KEY environment variable.")

# ---------------- FASTAPI ----------------
app = FastAPI(title="Doctor AI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class AnalyzeAndChatRequest(BaseModel):
    user_query: Optional[str] = None
    chat_history: Optional[List[dict]] = []

class ChatMessage(BaseModel):
    userId: str
    question: str
    answer: str
    isDeleted: bool = False
    timestamp: datetime = datetime.now()

# Initialize OpenAI client
client = OpenAI(api_key=openai_api_key)

# MongoDB Setup
MONGODB_URI = os.getenv("MONGODB_URI")
if MONGODB_URI:
    try:
        client_mongo = MongoClient(MONGODB_URI)
        db = client_mongo["doctor_ai"]
        medical_records = db["medical_records"]
        chats_collection = db["chat_conversations"]
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        # For now, we'll continue without MongoDB for basic functionality
        medical_records = None
        chats_collection = None
else:
    print("MongoDB URI not found, running without database")
    medical_records = None
    chats_collection = None

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Doctor AI API is running", "status": "success"}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# ------ Image Analysis Endpoints ------
@app.post("/analyze_and_store")
async def analyze_and_store(
    file: UploadFile = File(..., description="Medical image to analyze"),
    patient_id: str = Form(..., description="Patient identifier"),
    questions: str = Form(..., description="JSON string of 5 questions/answers"),
    diagnosis: str = Form(None),
    danger_level: str = Form(None)
):
    """
    Analyze medical image and store record (Note: File storage disabled on Vercel)
    """
    try:
        if not medical_records:
            raise HTTPException(status_code=503, detail="Database not available")
            
        # Validate and parse questions
        try:
            questions_list = json.loads(questions)
            if len(questions_list) != 5:
                raise ValueError("Exactly 5 questions required")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Read and process image
        image_data = await file.read()
        base64_image = encode_image(image_data)
        diagnosis = process_image_analysis(base64_image)

        # Create MongoDB record (without file storage on Vercel)
        record = {
            "patient_id": patient_id,
            "diagnosis": diagnosis,
            "questions": questions_list,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "file_info": {
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(image_data)
            }
        }

        # Insert record
        result = medical_records.insert_one(record)
        
        return {
            "status": "success",
            "record_id": str(result.inserted_id),
            "diagnosis": diagnosis
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/records/{patient_id}")
async def get_records(patient_id: str):
    """Get all records for a specific patient"""
    try:
        if not medical_records:
            raise HTTPException(status_code=503, detail="Database not available")
            
        records = list(medical_records.find({"patient_id": patient_id}, {"_id": 0}))
        return {"status": "success", "records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------- Chat Endpoints -------
@app.post("/chats")
async def save_chat(chat: ChatMessage):
    """Save a chat conversation"""
    try:
        if not chats_collection:
            raise HTTPException(status_code=503, detail="Database not available")
            
        chat_dict = chat.dict()
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
    """Get all chats for a specific user"""
    try:
        if not chats_collection:
            raise HTTPException(status_code=503, detail="Database not available")
            
        query = {"userId": user_id}
        if not include_deleted:
            query["isDeleted"] = False
            
        chats = list(chats_collection.find(query, {"_id": 0}))
        
        return {
            "status": "success",
            "chats": chats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/chats/{chat_id}/delete")
async def soft_delete_chat(chat_id: str):
    """Soft delete a chat"""
    try:
        if not chats_collection:
            raise HTTPException(status_code=503, detail="Database not available")
            
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

# ------ Main Chat Analysis Endpoint ------
@app.post("/analyze_and_chat")
async def analyze_and_chat(
    file: UploadFile = File(None, media_type=["image/jpeg", "image/png", "image/jpg"]),
    user_query: str = Form(None),
    chat_history: str = Form("[]")
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

# For Vercel deployment
app = app