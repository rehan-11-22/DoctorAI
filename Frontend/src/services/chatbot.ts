// src/services/chat.ts
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.0.105:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SavedChat {
  userId: string;
  question: string;
  answer: string;
}

export interface ChatHistory {
  id: string;
  userId: string;
  question: string;
  answer: string;
  createdAt: string;
  isDeleted: boolean;
}

export const sendChatMessage = async (
  user_query: string,
  chat_history: ChatMessage[] = []
): Promise<{ reply?: string; diagnosis?: string }> => {
  try {
    // Get user ID from storage
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      throw new Error("User authentication required");
    }

    // Prepare form data for analysis endpoint
    const formData = new FormData();
    formData.append("user_query", user_query);
    formData.append("chat_history", JSON.stringify(chat_history));

    // Send to analysis endpoint
    const analysisResponse = await fetch(`${API_URL}/analyze_and_chat`, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const botResponse =
      analysisData.reply ||
      analysisData.diagnosis ||
      "I couldn't process that request";

    // Save conversation to database
    await saveChatToDb({
      userId,
      question: user_query,
      answer: botResponse,
    });

    return analysisData;
  } catch (error) {
    console.error("Chat service error:", error);
    throw error;
  }
};

export const getUserChatHistory = async (
  includeDeleted: boolean = false
): Promise<ChatHistory[]> => {
  try {
    // Get user ID from storage
    const userId = await AsyncStorage.getItem("userId");
    if (!userId) {
      throw new Error("User authentication required");
    }

    // Fetch chat history from API
    const response = await fetch(
      `${API_URL}/chats/${userId}?include_deleted=${includeDeleted}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "success") {
      return data.chats || [];
    } else {
      throw new Error("Failed to fetch chat history");
    }
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    throw error;
  }
};

const saveChatToDb = async (chat: SavedChat): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/chats`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chat),
    });

    if (!response.ok) {
      throw new Error(`Save failed: ${response.status}`);
    }

    await response.json();
  } catch (error) {
    console.error("Failed to save chat:", error);
    throw error;
  }
};
