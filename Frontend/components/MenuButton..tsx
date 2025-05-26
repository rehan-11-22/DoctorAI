import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Dimensions,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { useMenu } from "@/src/context/MenuContext";
import { useChat } from "@/src/context/ChatContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
const { width, height } = Dimensions.get("window");

type ValidRoute = "/" | "/login" | "/camera" | "/chatbot" | "/symptoms";

export const MenuButton = ({ inHeader = false }: { inHeader?: boolean }) => {
  const { showMenu, setShowMenu, toggleMenu } = useMenu();
  const router = useRouter();
  const { logout } = useAuth();
  const navigationLock = React.useRef(false);
  const { refreshForNewUser } = useChat();

  const handleNavigation = (route: ValidRoute) => {
    if (navigationLock.current) return;
    navigationLock.current = true;

    setShowMenu(false);
    router.push(route);

    setTimeout(() => {
      navigationLock.current = false;
    }, 500);
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const handleBackdropPress = () => {
    setShowMenu(false);
  };

  return (
    <View style={inHeader ? styles.headerContainer : styles.homeContainer}>
      <TouchableOpacity
        onPress={toggleMenu}
        style={styles.menuButton}
        // activeOpacity={0.7}
      >
        <MaterialIcons name="menu" size={28} color="#000000" />
      </TouchableOpacity>
    </View>
  );
};

// Create a separate component for the menu content
export const MenuContent = ({ isHome = false }: { isHome?: boolean }) => {
  const { showMenu, setShowMenu } = useMenu();
  const router = useRouter();
  const { logout } = useAuth();
  const navigationLock = React.useRef(false);

  if (!showMenu) return null;

  const handleNavigation = (route: ValidRoute) => {
    if (navigationLock.current) return;
    navigationLock.current = true;

    setShowMenu(false);
    router.push(route);

    setTimeout(() => {
      navigationLock.current = false;
    }, 500);
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    try {
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("userToken");
      await logout();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const handleBackdropPress = () => {
    setShowMenu(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBackdropPress}
      />
      <View style={isHome ? styles.homeMenuContainer : styles.menuContainer}>
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => handleNavigation("/home")}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="home" size={20} color="#7928CA" />
              <Text style={styles.menuText}>Home</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={styles.menuItemContent}>
              <FontAwesome name="sign-out" size={20} color="#ff4444" />
              <Text style={[styles.menuText, styles.signOutText]}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 999,
  },
  headerContainer: {
    zIndex: 999,
  },
  menuButton: {
    padding: 8,
    // backgroundColor: "rgba(255, 255, 255, 0.9)",
    // borderRadius: 20,
    // elevation: 3,
    // // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.2,
    // shadowRadius: 3,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 998,
  },
  // Menu positioned for regular screens (in header)
  menuContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 999,
  },
  // Specific positioning for home screen
  homeMenuContainer: {
    position: "absolute",
    top: 110, // More spacing from the top for home screen
    right: 20,
    zIndex: 999,
  },
  menu: {
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 170,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  signOutText: {
    color: "#ff4444",
    fontWeight: "600",
  },
});
