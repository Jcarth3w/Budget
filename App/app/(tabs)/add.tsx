import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import Reanimated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useTransaction } from "@/hooks/useTransaction";
import { useBudget } from "@/hooks/useBudget";
import { CATEGORIES, CATEGORY_BY_COL, NEEDS_KEYS, WANTS_KEYS } from "@/constants/categories";
import { fmt, formatDate } from "@/utils/format";
import { AmbientGlow, FadeSlideIn, PressScale } from "@/components/motion";

const QUICK = [5, 10, 15, 25, 50];

export default function AddScreen() {
  const {
    amount, setAmount,
    selectedCategory, setSelectedCategory,
    date, setDate,
    loading,
    status,
    shakeAnim,
    submit,
    lastAdded,
  } = useTransaction();
  const { data } = useBudget();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const cat = selectedCategory ? CATEGORY_BY_COL[selectedCategory] : null;
  const parsed = parseFloat(amount);
  const hasAmount = !isNaN(parsed) && parsed > 0;

  const preview = useMemo(() => {
    if (!cat || !data) return null;
    const spent = (data.breakdown as Record<string, number>)[cat.key] ?? 0;
    const bucketKeys = cat.bucket === "needs" ? NEEDS_KEYS : WANTS_KEYS;
    const bucketSpent = bucketKeys.reduce(
      (s, k) => s + ((data.breakdown as Record<string, number>)[k] ?? 0),
      0
    );
    const bucketTarget = cat.bucket === "needs" ? data.budget503020.needs : data.budget503020.wants;
    const add = hasAmount ? parsed : 0;
    return {
      spent,
      next: spent + add,
      bucketLabel: cat.bucket === "needs" ? "Needs" : "Wants",
      bucketSpent,
      bucketTarget,
      bucketNext: bucketSpent + add,
    };
  }, [cat, data, hasAmount, parsed]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <AmbientGlow color={cat?.color ?? "#7DF9C2"} intensity="strong" />

      <FadeSlideIn delay={0}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>New Entry</Text>
          <Text style={styles.title}>Add</Text>
        </View>
      </FadeSlideIn>

      {lastAdded && (
        <Reanimated.View entering={FadeIn.duration(300)} style={styles.lastChip}>
          <Text style={styles.lastChipText}>
            Last up · {fmt(lastAdded.amount)} {lastAdded.label}
          </Text>
        </Reanimated.View>
      )}

      <FadeSlideIn delay={80}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={[styles.amountContainer, cat && { borderColor: cat.color }]}>
            <Text style={[styles.currencySymbol, cat && { color: cat.color }]}>$</Text>
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
        <View style={styles.quickRow}>
          {QUICK.map((n) => (
            <PressScale
              key={n}
              scaleTo={0.92}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAmount(n.toFixed(2));
              }}
              style={[styles.quickChip, amount === n.toFixed(2) && styles.quickChipOn]}
            >
              <Text style={[styles.quickText, amount === n.toFixed(2) && styles.quickTextOn]}>
                ${n}
              </Text>
            </PressScale>
          ))}
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={140}>
        <PressScale
          onPress={() => setShowDatePicker(!showDatePicker)}
          style={styles.dateButton}
        >
          <Text style={styles.dateButtonEmoji}>📅</Text>
          <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
          <Text style={styles.dateChevron}>›</Text>
        </PressScale>
      </FadeSlideIn>

      {showDatePicker && (
        <Reanimated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)}>
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
        </Reanimated.View>
      )}

      <FadeSlideIn delay={200}>
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((item) => {
            const isSelected = selectedCategory === item.col;
            return (
              <PressScale
                key={item.col}
                scaleTo={0.96}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSelectedCategory(item.col);
                }}
                style={[
                  styles.categoryButton,
                  isSelected && { borderColor: item.color, backgroundColor: `${item.color}18` },
                ]}
              >
                <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                <Text style={[styles.categoryLabel, isSelected && { color: item.color, fontFamily: "PoppinsBold" }]}>
                  {item.label}
                </Text>
              </PressScale>
            );
          })}
        </View>
      </FadeSlideIn>

      {preview && cat && (
        <Reanimated.View
          entering={FadeIn.duration(280)}
          style={[styles.preview, { borderColor: cat.color }]}
        >
          <Text style={styles.previewEmoji}>{cat.emoji}</Text>
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>{cat.label} this month</Text>
            <Text style={styles.previewLine}>
              {fmt(preview.spent)}
              {hasAmount ? `  →  ${fmt(preview.next)}` : ""}
            </Text>
            <Text style={styles.previewBucket}>
              {preview.bucketLabel} {fmt(preview.bucketNext)} of {fmt(preview.bucketTarget)}
            </Text>
          </View>
        </Reanimated.View>
      )}

      {status && (
        <Reanimated.Text
          entering={status.type === "success" ? ZoomIn.springify().damping(14) : FadeIn}
          style={[styles.statusText, status.type === "error" ? styles.errorText : styles.successText]}
        >
          {status.message}
        </Reanimated.Text>
      )}

      <FadeSlideIn delay={280}>
        <PressScale
          onPress={submit}
          disabled={loading}
          style={[styles.submitButton, cat && { backgroundColor: cat.color }]}
        >
          {loading
            ? <ActivityIndicator color="#0D0D0F" />
            : <Text style={styles.submitLabel}>
                {hasAmount && cat ? `Add ${fmt(parsed)} to ${cat.label}` : "Add Transaction"}
              </Text>
          }
        </PressScale>
      </FadeSlideIn>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0D0D0F" },
  container: { padding: 24, paddingTop: 56, paddingBottom: 120 },
  header: { marginBottom: 16 },
  eyebrow: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: { fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0", lineHeight: 46 },
  lastChip: {
    alignSelf: "flex-start",
    backgroundColor: "#16161A",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  lastChipText: { fontFamily: "Poppins", fontSize: 12, color: "#888" },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161A",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 12,
  },
  currencySymbol: { fontFamily: "PoppinsBold", fontSize: 32, color: "#7DF9C2", marginRight: 8 },
  amountInput: { flex: 1, fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0" },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickChip: {
    flex: 1,
    backgroundColor: "#16161A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 10,
    alignItems: "center",
  },
  quickChipOn: { borderColor: "#7DF9C2", backgroundColor: "#0D2A1F" },
  quickText: { fontFamily: "PoppinsBold", fontSize: 13, color: "#888" },
  quickTextOn: { color: "#7DF9C2" },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
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
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
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
  categoryEmoji: { fontSize: 26 },
  categoryLabel: { fontFamily: "Poppins", fontSize: 13, color: "#666" },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#16161A",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  previewEmoji: { fontSize: 28 },
  previewCopy: { flex: 1 },
  previewTitle: { fontFamily: "Poppins", fontSize: 12, color: "#888", marginBottom: 2 },
  previewLine: { fontFamily: "PoppinsBold", fontSize: 16, color: "#F0F0F0" },
  previewBucket: { fontFamily: "Poppins", fontSize: 12, color: "#666", marginTop: 2 },
  statusText: { fontFamily: "Poppins", fontSize: 14, textAlign: "center", marginBottom: 16 },
  errorText: { color: "#FF6B6B" },
  successText: { color: "#7DF9C2" },
  submitButton: {
    backgroundColor: "#7DF9C2",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  submitLabel: { fontFamily: "PoppinsBold", fontSize: 16, color: "#0D0D0F", letterSpacing: 0.5 },
});
