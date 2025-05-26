import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

// Helper function to render formatted text
const renderFormattedText = (text: string) => {
  if (!text) return null;

  // Split text into parts based on markdown-like syntax
  const parts = text.split(/(\*\*.*?\*\*|### .*?\n)/).filter((part) => part);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Bold text
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(2, -2)}
        </Text>
      );
    } else if (part.startsWith("### ")) {
      // Heading
      return (
        <Text key={index} style={styles.subSectionTitle}>
          {part.slice(4).trim()}
        </Text>
      );
    } else {
      // Regular text
      return (
        <Text key={index} style={styles.detailText}>
          {part}
        </Text>
      );
    }
  });
};

export default function DetailsScreen() {
  const params = useLocalSearchParams();

  // Extract all parameters with proper type checking
  const { id, image_url, description, date, title, questions } = params as {
    id: string;
    image_url: string;
    description: string;
    date: string;
    title: string;
    questions?: string;
  };

  // Parse questions if they exist
  const parsedQuestions = questions ? JSON.parse(questions) : [];

  if (!id || !image_url) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Image Section */}
      <View style={styles.imageSection}>
        <Image
          source={{ uri: image_url }}
          style={styles.headerImage}
          resizeMode="cover"
        />
      </View>

      {/* Details Section */}
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Analysis Details</Text>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{title || "Skin Analysis"}</Text>
          <Text style={styles.detailDate}>{date || ""}</Text>

          {/* Full Diagnosis with formatted text */}
          <Text style={styles.subSectionTitle}>Diagnosis</Text>
          <View style={styles.diagnosisText}>
            {renderFormattedText(description) || "No description available"}
          </View>

          {/* Questions & Answers */}
          {parsedQuestions.length > 0 && (
            <>
              <Text style={styles.subSectionTitle}>Symptoms</Text>
              <View style={styles.questionsContainer}>
                {parsedQuestions.map((q: any, index: number) => (
                  <View key={index} style={styles.questionItem}>
                    <Text style={styles.questionText}>• {q.question}</Text>
                    <Text style={styles.answerText}>Answer: {q.answer}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageSection: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerImage: {
    width: "100%",
    height: 290,
  },
  detailSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  detailCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  diagnosisText: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  boldText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
    lineHeight: 24,
  },
  questionsContainer: {
    marginTop: 8,
  },
  questionItem: {
    marginBottom: 12,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginLeft: 12,
  },
});
