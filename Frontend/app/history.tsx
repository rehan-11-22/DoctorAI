// app/history/index.tsx
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { HistorySection } from "./HistoryComponent";
import { DualToneBackground } from "@/components/ui/DualToneBackground";
import { useLocalSearchParams } from "expo-router";

export default function FullHistoryPage() {
  const { items } = useLocalSearchParams();
  const historyItems = items ? JSON.parse(items as string) : [];

  return (
    <DualToneBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <HistorySection historyItems={historyItems} showHeader={false} />
      </ScrollView>
    </DualToneBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 30,
  },
});
