import { useRouter } from "expo-router";
import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useRef,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type User = {
  name: string;
  email: string;
  role?: string;
  userId?: string; // Added userId to User type
};

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
};

type AuthAction =
  | { type: "LOGIN"; payload: { user: User; token: string } }
  | { type: "LOGOUT" }
  | { type: "LOADING" }
  | { type: "ERROR"; payload: string }
  | {
      type: "RESTORE_AUTH";
      payload: { user: User | null; token: string | null };
    };

type AuthContextType = {
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true, // Start with true to check auth state
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        error: null,
      };
    case "LOGOUT":
      return {
        ...initialState,
        isLoading: false,
      };
    case "LOADING":
      return { ...state, isLoading: true, error: null };
    case "ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "RESTORE_AUTH":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
      };
    default:
      return state;
  }
};

// Helper functions for AsyncStorage
const storeAuthData = async (user: User, token: string) => {
  try {
    await AsyncStorage.multiSet([
      ["user", JSON.stringify(user)],
      ["token", token],
      ["userId", user.userId || ""],
    ]);
  } catch (error) {
    console.error("Error storing auth data:", error);
  }
};

const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(["user", "token", "userId"]);
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};

const loadAuthData = async () => {
  try {
    const [userString, token] = await AsyncStorage.multiGet(["user", "token"]);
    const user = userString[1] ? JSON.parse(userString[1]) : null;
    return { user, token: token[1] };
  } catch (error) {
    console.error("Error loading auth data:", error);
    return { user: null, token: null };
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
  const navigationRef = useRef(router);

  useEffect(() => {
    navigationRef.current = router;
  }, [router]);

  // Check for existing auth data on mount
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { user, token } = await loadAuthData();
        if (user && token) {
          dispatch({ type: "RESTORE_AUTH", payload: { user, token } });
          navigationRef.current.replace("/home");
        } else {
          dispatch({
            type: "RESTORE_AUTH",
            payload: { user: null, token: null },
          });
        }
      } catch (error) {
        console.error("Error checking auth state:", error);
        dispatch({
          type: "RESTORE_AUTH",
          payload: { user: null, token: null },
        });
      }
    };

    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: "LOADING" });

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const response = await fetch("http://192.168.0.105:3001/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      const userData = data.user || data;
      const user = {
        name: userData.fullName || userData.name || "User",
        email: userData.email,
        role: userData.role,
        userId: userData.userId, // Make sure to include userId
      };

      // Store auth data
      await storeAuthData(user, data.token || data.accessToken);

      dispatch({
        type: "LOGIN",
        payload: {
          user,
          token: data.token || data.accessToken,
        },
      });

      navigationRef.current.replace("/home");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      dispatch({ type: "ERROR", payload: errorMessage });
      console.error("Login error:", error);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      dispatch({ type: "LOADING" });

      if (!name || !email || !password) {
        throw new Error("All fields are required");
      }
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const response = await fetch(
        "http://192.168.0.105:3001/api/user/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            role: "USER",
            roleId: "58962cb7-9c11-4a7b-93f6-dfdfa20eae64",
            fullName: name,
          }),
        }
      );

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      const userData = data.user || data;
      const user = {
        name: userData.fullName || name,
        email: userData.email,
        role: userData.role || "USER",
        userId: userData.userId, // Make sure to include userId
      };

      // Store auth data
      await storeAuthData(user, data.token || data.accessToken);

      dispatch({
        type: "LOGIN",
        payload: {
          user,
          token: data.token || data.accessToken,
        },
      });

      navigationRef.current.replace("/home");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Signup failed";
      dispatch({ type: "ERROR", payload: errorMessage });
      console.error("Signup error:", error);
    }
  };

  const logout = async () => {
    await clearAuthData();
    dispatch({ type: "LOGOUT" });
    navigationRef.current.replace("/(auth)/login");
  };

  return (
    <AuthContext.Provider value={{ state, dispatch, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
