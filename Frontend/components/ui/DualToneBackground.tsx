import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface DualToneBackgroundProps {
  children?: React.ReactNode;
  style?: object;
}

export function DualToneBackground({
  children,
  style,
}: DualToneBackgroundProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Top half - Purple gradient (light to dark) */}
      <LinearGradient
        colors={["#9948a3", "#7b0e87"]} // Light purple to dark purple
        style={styles.topHalf}
        start={{ x: 0.5, y: 0 }} // Vertical gradient start
        end={{ x: 0.5, y: 1 }} // Vertical gradient end
      />

      {/* Bottom half - Grey gradient (light to dark) */}
      <LinearGradient
        colors={["#F3F4F6", "#E5E7EB"]} // Light grey to darker grey
        style={styles.bottomHalf}
        start={{ x: 0.5, y: 0 }} // Vertical gradient start
        end={{ x: 0.5, y: 1 }} // Vertical gradient end
      />

      {/* Content */}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    position: "relative",
  },
  topHalf: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  bottomHalf: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});
