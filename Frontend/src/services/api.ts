import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import Config from "react-native-config";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

console.log("Loaded SCAN_URL:", Config.SCAN_URL);

const API_URL = "http://192.168.0.105:8000";

export interface AnalysisResult {
  diagnosis: string;
  reply?: string;
  chat_history?: Array<{ role: string; content: string }>;
  danger_level?: number;
}

/**
 * Optimizes image size to reduce token usage when sending to AI
 * Enhanced version with more aggressive compression
 */
const optimizeImage = async (imageUri: string): Promise<string> => {
  try {
    console.log("Original image:", imageUri);

    // Get original image size for comparison
    const originalFileInfo = await FileSystem.getInfoAsync(imageUri);
    if (originalFileInfo.exists && "size" in originalFileInfo) {
      console.log("Original image size:", originalFileInfo.size / 1024, "KB");
    }

    // First optimization pass - reduce dimensions and apply moderate compression
    const firstPass = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 200 } }], // Further reduced width to 200px
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Check if the image is still large (over 100KB)
    const firstPassInfo = await FileSystem.getInfoAsync(firstPass.uri);

    let resultUri = firstPass.uri;

    // Apply second pass with more aggressive compression if still large
    if (
      firstPassInfo.exists &&
      "size" in firstPassInfo &&
      firstPassInfo.size > 100 * 1024
    ) {
      console.log("Image still large after first pass, applying second pass");

      const secondPass = await ImageManipulator.manipulateAsync(
        firstPass.uri,
        [], // No further resizing
        { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG } // More aggressive compression
      );

      resultUri = secondPass.uri;
    }

    console.log("Optimized image:", resultUri);

    // Get file info to check size reduction
    const fileInfo = await FileSystem.getInfoAsync(resultUri);
    // Check if fileInfo exists and has size property
    if (fileInfo.exists && "size" in fileInfo) {
      console.log("Optimized image size:", fileInfo.size / 1024, "KB");

      // Calculate and log the reduction percentage
      if (originalFileInfo.exists && "size" in originalFileInfo) {
        const reductionPercent =
          100 - (fileInfo.size / originalFileInfo.size) * 100;
        console.log(`Size reduced by ${reductionPercent.toFixed(2)}%`);
      }
    }

    return resultUri;
  } catch (error) {
    console.error("Error optimizing image:", error);
    // Fall back to original image if optimization fails
    return imageUri;
  }
};

/**
 * Advanced optimization with dynamic compression based on file size
 */
export const optimizeImageAdvanced = async (
  imageUri: string
): Promise<string> => {
  try {
    console.log("Original image:", imageUri);

    // Get original image size
    const originalFileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!originalFileInfo.exists || !("size" in originalFileInfo)) {
      throw new Error("Couldn't get original file info");
    }

    const originalSize = originalFileInfo.size;
    console.log("Original image size:", originalSize / 1024, "KB");

    // Define target size - more aggressive for larger images
    const targetSizeKB = originalSize > 1024 * 1024 ? 50 : 80; // 50KB for large images, 80KB for smaller ones

    // Initial sizing based on original file size
    let initialWidth = 200; // Default
    if (originalSize > 5 * 1024 * 1024) initialWidth = 150; // Very large files
    else if (originalSize < 200 * 1024) initialWidth = 300; // Small files

    // Initial compression level based on file size
    let compressionLevel = 0.6; // Default
    if (originalSize > 2 * 1024 * 1024) compressionLevel = 0.4; // More aggressive for larger files

    // First pass
    let result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: initialWidth } }],
      { compress: compressionLevel, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Check result size
    let resultInfo = await FileSystem.getInfoAsync(result.uri);
    let currentSize =
      resultInfo.exists && "size" in resultInfo ? resultInfo.size : 0;
    console.log("First pass size:", currentSize / 1024, "KB");

    // Additional passes if needed to reach target size
    let attempts = 1;
    const maxAttempts = 3;

    while (currentSize > targetSizeKB * 1024 && attempts < maxAttempts) {
      attempts++;

      // Increase compression or decrease size further
      compressionLevel = Math.max(0.2, compressionLevel - 0.15); // More aggressive compression
      initialWidth = Math.max(100, Math.floor(initialWidth * 0.8)); // Reduce width further

      result = await ImageManipulator.manipulateAsync(
        result.uri,
        [{ resize: { width: initialWidth } }],
        { compress: compressionLevel, format: ImageManipulator.SaveFormat.JPEG }
      );

      resultInfo = await FileSystem.getInfoAsync(result.uri);
      currentSize =
        resultInfo.exists && "size" in resultInfo ? resultInfo.size : 0;
      console.log(`Pass ${attempts} size:`, currentSize / 1024, "KB");
    }

    // Final logging
    if (resultInfo.exists && "size" in resultInfo) {
      const reductionPercent = 100 - (currentSize / originalSize) * 100;
      console.log(
        `Final image size: ${
          currentSize / 1024
        } KB (reduced by ${reductionPercent.toFixed(2)}%)`
      );
    }

    return result.uri;
  } catch (error) {
    console.error("Error optimizing image:", error);
    return imageUri; // Fall back to original
  }
};

export const analyzeSkinImage = async (
  imageUrl: string
): Promise<AnalysisResult> => {
  try {
    // Use the advanced optimization function instead
    const optimizedImageUrl = await optimizeImageAdvanced(imageUrl);

    // Create a new FormData instance
    const formData = new FormData();

    // Get file name and extension from the URI
    const uriParts = optimizedImageUrl.split(".");
    const fileType = uriParts[uriParts.length - 1].toLowerCase();

    // Ensure we have a valid image type
    const mimeType =
      fileType === "jpg" || fileType === "jpeg"
        ? "image/jpeg"
        : fileType === "png"
        ? "image/png"
        : "image/jpeg"; // Default to jpeg

    // Format URI correctly based on platform
    const formattedUri =
      Platform.OS === "android"
        ? optimizedImageUrl
        : optimizedImageUrl.replace("file://", "");

    // Create file object with proper React Native format
    const fileObject = {
      uri: formattedUri,
      name: `skin_image.${fileType}`,
      type: mimeType,
    };

    // Append file to FormData
    formData.append("file", fileObject as any);

    console.log("Sending form data with optimized file:", {
      uri: formattedUri,
      type: mimeType,
      name: `skin_image.${fileType}`,
    });

    console.log("Sending request to:", `${API_URL}/analyze_and_chat`);

    // Send the request
    const response = await fetch(`${API_URL}/analyze_and_chat`, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        // DO NOT set 'Content-Type' here - React Native sets it automatically with the boundary
      },
    });

    // Log response for debugging
    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.detail && Array.isArray(errorData.detail)) {
          // Handle FastAPI validation errors
          const validationError = errorData.detail[0];
          throw new Error(
            `Validation error: ${
              validationError.msg
            } at ${validationError.loc.join(".")}`
          );
        } else {
          throw new Error(
            errorData.detail ||
              errorData.message ||
              `API request failed with status ${response.status}`
          );
        }
      } catch (parseError) {
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }
    }

    const result = await response.json();
    console.log("API Response:", result);
    return result;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};

interface MedicalRecordData {
  imageUri: string;
  diagnosis: string;
  dangerLevel: number;
  questions: Array<{ question: string; answer: string }>;
}

export const saveMedicalRecord = async (data: MedicalRecordData) => {
  try {
    // 1. Get user ID and validate
    const userId = await AsyncStorage.getItem("userId");
    console.log("Using stored userId:", userId);

    if (!userId) {
      throw new Error("User authentication required");
    }

    // 2. Prepare FormData
    const formData = new FormData();

    // 3. Handle file upload differently for Android/iOS
    const filename =
      data.imageUri.split("/").pop() || `medical-${Date.now()}.jpg`;
    const fileType = "image/jpeg";

    if (Platform.OS === "android") {
      // Android requires special file URI handling
      formData.append("file", {
        uri: data.imageUri,
        name: filename,
        type: fileType,
      } as any);
    } else {
      // iOS needs the file:// prefix removed
      const iosUri = data.imageUri.replace("file://", "");
      formData.append("file", {
        uri: iosUri,
        name: filename,
        type: fileType,
      } as any);
    }

    // 4. Add other fields
    formData.append("patient_id", userId);
    formData.append("diagnosis", data.diagnosis);
    formData.append("danger_level", data.dangerLevel.toString());
    formData.append("questions", JSON.stringify(data.questions));

    // 5. Get auth token
    const token = await AsyncStorage.getItem("token");

    console.log("Sending to:", `${API_URL}/analyze_and_store`);

    // 7. Make the request
    const response = await fetch(`${API_URL}/analyze_and_store`, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    // 8. Handle response
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Server error response:", errorData);
      throw new Error(errorData.detail || "Server error");
    }

    return await response.json();
  } catch (error) {
    console.error("Full error details:", error);

    let errorMessage = "Failed to save medical record";
    if (error instanceof TypeError) {
      errorMessage = "Network error - check your connection and server URL";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
};
