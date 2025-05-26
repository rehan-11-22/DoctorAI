import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export const Footer = () => {
  const router = useRouter();

  const handlePress = () => {
    router.push("/home"); // Navigates to home screen
  };

  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={handlePress}>
        <Text style={styles.footerText}>DoctorAI</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: "#000000",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
