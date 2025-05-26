from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str

class AnalysisResponse(BaseModel):
    diagnosis: Optional[str]
    reply: Optional[str]
    chat_history: List[ChatMessage]