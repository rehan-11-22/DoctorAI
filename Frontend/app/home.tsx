import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { DualToneBackground } from "@/components/ui/DualToneBackground";
import HistorySection, { HistoryItemType } from "./HistoryComponent";
import { fetchPatientRecords } from "@/src/services/records";

export default function Home() {
  const router = useRouter();

  const [historyItems, setHistoryItems] = useState<HistoryItemType[]>([]);

  useEffect(() => {
    const loadRecords = async () => {
      const records = await fetchPatientRecords();
      // Transform API records to HistoryItemType format
      const items = records.map((record: any) => ({
        id: record._id || Math.random().toString(),
        date: new Date(record.created_at).toLocaleDateString(),
        title: "Skin Analysis",
        image_url: `http://192.168.0.105:8000${record.image_url}`,
        description: record.diagnosis || "No diagnosis available",
        questions: record.questions || [], // Add this line
      }));
      setHistoryItems(items);
    };

    loadRecords();
  }, []);

  // Show only first 3 items in home view
  const displayedItems = historyItems.slice(0, 3);

  const handleScanPress = () => {
    router.push("/camera");
  };

  const handleSymptomsQuizPress = () => {
    router.push("/symptoms");
  };

  const handleChatBotPress = () => {
    router.push("/chatbot");
  };

  return (
    <DualToneBackground>
      <View style={styles.mainContainer}>
        {/* Top Section with Header and Buttons */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Doctor AI</Text>
            <Text style={styles.headerSubtitle}>
              Your personal skin care assistant
            </Text>
          </View>

          {/* Centered Column of Action Buttons */}
          <View style={styles.centeredButtonColumn}>
            <Button
              title="Scan Skin"
              onPress={handleScanPress}
              variant="primary"
              style={styles.button}
            />
            <View style={styles.buttonSpacing} />
            <Button
              title="Symptoms Quiz"
              onPress={handleSymptomsQuizPress}
              variant="primary"
              style={styles.button}
            />
            <View style={styles.buttonSpacing} />
            <Button
              title="Chat Bot"
              onPress={handleChatBotPress}
              variant="primary"
              style={styles.button}
            />
          </View>
        </View>

        {/* Grey Background History Section */}
        <View style={styles.historyBackground}>
          <ScrollView style={styles.scrollContainer}>
            <HistorySection
              historyItems={displayedItems}
              allItems={historyItems}
            />
          </ScrollView>
        </View>
      </View>
    </DualToneBackground>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  topSection: {
    height: "50%",
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 5,
    // alignItems: "left", // Center header text
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#fff",
    marginTop: 4,
  },
  centeredButtonColumn: {
    flex: 1, // Take up available space
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    // paddingBottom: 40, // Add some padding at the bottom
  },
  button: {
    // width: 200, // Wider buttons for better appearance
    height: 35, // Slightly taller buttons
    marginVertical: 2, // Small vertical margin between buttons
    shadowColor: "#d9d6d0",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 2,
    shadowRadius: 6,

    // Shadow (Android)
    elevation: 12,
  },
  buttonSpacing: {
    height: 12, // Consistent spacing between buttons
  },
  historyBackground: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    // paddingTop: 20,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
