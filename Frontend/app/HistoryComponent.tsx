// components/HistoryComponent.tsx
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export interface HistoryItemType {
  id: string;
  date: string;
  title: string;
  image_url: string;
  description: string;
}

interface HistoryItemProps {
  item: HistoryItemType;
}

interface HistorySectionProps {
  historyItems: HistoryItemType[];
  allItems?: HistoryItemType[];
  showHeader?: boolean;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item }) => {
  const router = useRouter();

  const handleItemPress = () => {
    router.push({
      pathname: "/details",
      params: {
        id: item.id,
        image_url: item.image_url,
        description: item.description,
        date: item.date,
        title: item.title,
        questions: JSON.stringify(item.questions || []), // Add this line
      },
    });
  };

  return (
    <TouchableOpacity style={styles.historyBox} onPress={handleItemPress}>
      <View style={styles.boxContent}>
        <Image source={{ uri: item.image_url }} style={styles.boxImage} />
        <View style={styles.textContainer}>
          <Text style={styles.boxTitle}>{item.title}</Text>
          <Text style={styles.boxDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.boxDate}>{item.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const HistorySection: React.FC<HistorySectionProps> = ({
  historyItems,
  allItems = historyItems,
  showHeader = true,
}) => {
  const router = useRouter();

  const handleViewAll = () => {
    router.push({
      pathname: "/history",
      params: {
        items: JSON.stringify(allItems),
      },
    });
  };

  return (
    <View style={styles.historySection}>
      {showHeader && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>

          <TouchableOpacity onPress={handleViewAll}>
            <Text style={styles.viewAll}>View All ({allItems.length})</Text>
          </TouchableOpacity>
        </View>
      )}
      {historyItems.map((item) => (
        <HistoryItem key={item.id} item={item} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  historySection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
  },
  viewAll: {
    color: "#4361ee",
    fontWeight: "500",
  },
  historyBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  boxContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  boxImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
    backgroundColor: "#f1f5f9",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0f172a",
    marginBottom: 4,
  },
  boxDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 4,
  },
  boxDate: {
    fontSize: 12,
    color: "#64748b",
  },
});

export default HistorySection;
