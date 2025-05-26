from fastapi import FastAPI, UploadFile, Form, HTTPException, File
from pydantic import BaseModel
from typing import List, Optional
import openai
import json
from utils import encode_image, process_image_analysis
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pymongo import MongoClient
from datetime import datetime
import uuid
import os
from bson.objectid import ObjectId
import tempfile

# ---------------- SETUP OPENAI ----------------
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OpenAI API key not found. Please set it in .env file.")

# ---------------- FASTAPI ----------------
app = FastAPI(title="Doctor AI API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

# ---------------- API Endpoints ----------------
@app.post("/analyze_and_store")
async def analyze_and_store(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    questions: str = Form(...),
    diagnosis: str = Form(None),
    danger_level: str = Form(None)
):
    try:
        # Validate and parse questions
        try:
            questions_list = json.loads(questions)
            if len(questions_list) != 5:
                raise ValueError("Exactly 5 questions required")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Process image in memory
        image_data = await file.read()
        base64_image = encode_image(image_data)
        diagnosis = process_image_analysis(base64_image)

        # Store record with base64 image data
        record = {
            "patient_id": patient_id,
            "image_data": base64_image,
            "diagnosis": diagnosis,
            "questions": questions_list,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }

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
    records = list(medical_records.find({"patient_id": patient_id}, {"_id": 0}))
    return {"status": "success", "records": records}

class ChatMessage(BaseModel):
    userId: str
    question: str
    answer: str
    isDeleted: bool = False
    timestamp: datetime = datetime.now()

@app.post("/chats")
async def save_chat(chat: ChatMessage):
    try:
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
    try:
        query = {"userId": user_id}
        if not include_deleted:
            query["isDeleted"] = False
            
        chats = list(chats_collection.find(query, {"_id": 0}))
        return {"status": "success", "chats": chats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/chats/{chat_id}/delete")
async def soft_delete_chat(chat_id: str):
    try:
        result = chats_collection.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": {"isDeleted": True}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Chat not found")
        return {"status": "success", "message": "Chat marked as deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_and_chat")
async def analyze_and_chat(
    file: UploadFile = File(None),
    user_query: str = Form(None),
    chat_history: str = Form("[]")
):
    try:
        history = json.loads(chat_history) if chat_history else []
        diagnosis = None
        
        if file and file.content_type.startswith('image/'):
            image_data = await file.read()
            base64_image = encode_image(image_data)
            diagnosis = process_image_analysis(base64_image)
            history.append({"role": "assistant", "content": diagnosis})
        
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
            "reply": reply or None,
            "chat_history": history
        }
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid chat_history format")
    except Exception as e:
        raise HTTPException(500, str(e))

# Vercel handler
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))