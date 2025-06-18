import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

SplashScreen.preventAutoHideAsync(); // Keep splash until fonts load

const SHEET_ID = "10OZYDI7qBnCSsTnSVvu-1kAoyPbSstttmKY4jouvNUs";
const API_KEY = "AIzaSyBsu79gNzGMkBeJx0iywf5plz4JC9qJtHw";

const TITLE_RANGE = "Sheet2!B1";
const DATA_RANGE = "Sheet2!B2:D4";
const title_url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TITLE_RANGE}?key=${API_KEY}`;
const data_url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${DATA_RANGE}?key=${API_KEY}`;

export default function Index() {
  const [data, setData] = useState<{
    needs?: { budgeted: string; remaining: string };
    wants?: { budgeted: string; remaining: string };
    investments?: { budgeted: string; remaining: string };
  }>({});
  const [title, setTitle] = useState<string>("Budget");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Poppins: require("../../assets/fonts/Poppins-Regular.ttf"),
    PoppinsBold: require("../../assets/fonts/Poppins-Bold.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // ✅ Animation logic
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handleTap = () => {
    scale.value = withSpring(1.1, { damping: 3, stiffness: 120 }, () => {
      scale.value = withSpring(1);
    });
  };

  useEffect(() => {
    if (!fontsLoaded) return;

    console.log("📡 Fetching from sheets...");

    const fetchTitle = fetch(title_url).then((res) => res.json());
    const fetchData = fetch(data_url).then((res) => res.json());

    Promise.all([fetchTitle, fetchData])
      .then(([titleJson, dataJson]) => {
        console.log("✅ Title:", titleJson);
        console.log("✅ Budget Data:", dataJson);

        if (titleJson.values?.[0]?.[0]) {
          setTitle(titleJson.values[0][0]);
        }

        const values = dataJson.values || [];
        if (values.length < 3) throw new Error("Unexpected data format");

        const [headers, budgeted, remaining] = values;

        const parsed = {
          needs: {
            budgeted: budgeted[0],
            remaining: remaining[0],
          },
          wants: {
            budgeted: budgeted[1],
            remaining: remaining[1],
          },
          investments: {
            budgeted: budgeted[2],
            remaining: remaining[2],
          },
        };

        setData(parsed);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load data.");
        setLoading(false);
      });
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (loading) {
    return (
      <View style={styles.loadingContainer} onLayout={onLayoutRootView}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={[styles.loadingText, { fontFamily: "Poppins" }]}>
          Loading your budget...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      onLayout={onLayoutRootView}
    >
      <Pressable onPress={handleTap}>
        <Animated.Text style={[styles.title, animatedStyle]}>
          💸 {title} Budget
        </Animated.Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.header}>Needs</Text>
        <Text style={styles.label}>Budgeted</Text>
        <Text style={styles.needs}>{data.needs?.budgeted || "—"}</Text>
        <Text style={styles.label}>Remaining</Text>
        <Text style={styles.needs}>{data.needs?.remaining || "—"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.header}>Wants</Text>
        <Text style={styles.label}>Budgeted</Text>
        <Text style={styles.wants}>{data.wants?.budgeted || "—"}</Text>
        <Text style={styles.label}>Remaining</Text>
        <Text style={styles.wants}>{data.wants?.remaining || "—"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.header}>Investments</Text>
        <Text style={styles.label}>Budgeted</Text>
        <Text style={styles.investments}>{data.investments?.budgeted || "—"}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#F0F4FF",
    flexGrow: 1,
    alignItems: "center",
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 18,
    color: "#1E3A8A",
  },
  title: {
    fontSize: 44,
    fontWeight: "800",
    color: "#1E3A8A",
    fontFamily: "PoppinsBold",
  },
  error: {
    color: "red",
    marginVertical: 10,
  },
  card: {
    backgroundColor: "#E0E7FF",
    width: "100%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E3A8A",
    fontFamily: "PoppinsBold",
  },
  label: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    fontFamily: "Poppins",
  },
  needs: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#3B82F6",
    fontFamily: "Poppins",
  },
  wants: {
    fontSize: 24,
    fontWeight: "600",
    color: "#6366F1",
    fontFamily: "Poppins",
  },
  investments: {
    fontSize: 20,
    fontWeight: "500",
    color: "#06B6D4",
    fontFamily: "Poppins",
  },
});
