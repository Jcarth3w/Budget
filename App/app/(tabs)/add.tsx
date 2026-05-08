import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTransaction } from "@/hooks/useTransaction";
import { CATEGORIES } from "../../constants/categories";
import { formatDate } from "@/utils/format";

export default function AddScreen() {
  const {
    amount, setAmount,
    selectedCategory, setSelectedCategory,
    date, setDate,
    loading,
    status,
    shakeAnim,
    submit,
  } = useTransaction();

  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>New Entry</Text>
        <Text style={styles.title}>Add Transaction</Text>
      </View>

      {/* Amount input */}
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#333"
            selectionColor="#7DF9C2"
          />
        </View>
      </Animated.View>

      {/* Date picker */}
      <Pressable
        style={styles.dateButton}
        onPress={() => setShowDatePicker(!showDatePicker)}
      >
        <Text style={styles.dateButtonEmoji}>📅</Text>
        <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
        <Text style={styles.dateChevron}>›</Text>
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selected) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selected) setDate(selected);
          }}
          themeVariant="dark"
          maximumDate={new Date()}
        />
      )}

      {/* Category grid */}
      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.col;
          return (
            <Pressable
              key={cat.col}
              style={[styles.categoryButton, isSelected && styles.categoryButtonSelected]}
              onPress={() => setSelectedCategory(cat.col)}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Status message */}
      {status && (
        <Text style={[styles.statusText, status.type === "error" ? styles.errorText : styles.successText]}>
          {status.message}
        </Text>
      )}

      {/* Submit */}
      <Pressable
        style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
        onPress={submit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#0D0D0F" />
          : <Text style={styles.submitLabel}>Add Transaction</Text>
        }
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0D0D0F" },
  container: { padding: 24, paddingTop: 64, paddingBottom: 120 },
  header: { marginBottom: 32 },
  eyebrow: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0", lineHeight: 46 },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 14,
  },
  currencySymbol: { fontFamily: "PoppinsBold", fontSize: 32, color: "#7DF9C2", marginRight: 8 },
  amountInput: { flex: 1, fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 28,
    gap: 10,
  },
  dateButtonEmoji: { fontSize: 18 },
  dateButtonText: { flex: 1, fontFamily: "Poppins", fontSize: 15, color: "#AAA" },
  dateChevron: { fontSize: 22, color: "#444" },
  sectionLabel: {
    fontFamily: "PoppinsBold",
    fontSize: 13,
    color: "#444",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 },
  categoryButton: {
    width: "47%",
    backgroundColor: "#16161A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  categoryButtonSelected: { backgroundColor: "#0D2A1F", borderColor: "#7DF9C2" },
  categoryEmoji: { fontSize: 26 },
  categoryLabel: { fontFamily: "Poppins", fontSize: 13, color: "#666" },
  categoryLabelSelected: { color: "#7DF9C2", fontFamily: "PoppinsBold" },
  statusText: { fontFamily: "Poppins", fontSize: 14, textAlign: "center", marginBottom: 16 },
  errorText: { color: "#FF6B6B" },
  successText: { color: "#7DF9C2" },
  submitButton: {
    backgroundColor: "#7DF9C2",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  submitButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  submitLabel: { fontFamily: "PoppinsBold", fontSize: 16, color: "#0D0D0F", letterSpacing: 0.5 },
});