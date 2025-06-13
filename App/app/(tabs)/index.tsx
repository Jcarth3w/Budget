import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

// 🔁 Replace with your local IP if testing on physical device
const BACKEND_URL = "http://192.168.1.4:3001/budget";

export default function Index() {
  const [data, setData] = useState<string[][]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(BACKEND_URL)
      .then((res) => res.json())
      .then((json) => {
        setData(json.values || []);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load data.");
      });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📊 Budget Overview</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {data.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((cell, j) => (
            <Text key={j} style={styles.cell}>{cell}</Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fdfdfd", // light background
    gap: 10,
    minHeight: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333", // darker text
    marginBottom: 10,
  },
  error: {
    color: "red",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f0f0f0", // light gray card-like background
    padding: 10,
    borderRadius: 8,
  },
  cell: {
    marginRight: 10,
    fontSize: 16,
    color: "#000",
  },
});
