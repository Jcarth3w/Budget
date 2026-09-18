import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import Reanimated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { useTransaction, type EntryType } from "@/hooks/useTransaction";
import { useBudget } from "@/hooks/useBudget";
import { CATEGORIES, CATEGORY_BY_COL } from "@/constants/categories";
import { fmt, formatDate, addDays, isSameDay, startOfDay } from "@/utils/format";
import { AmbientGlow, FadeSlideIn, PressScale } from "@/components/motion";
import { CalendarPicker } from "@/components/CalendarPicker";
import { CategoryIcon } from "@/components/CategoryIcon";

const SPEND_QUICK = [5, 10, 15, 25, 50];
const INCOME_QUICK = [250, 500, 1000, 1500, 2000];

export default function AddScreen() {
  const {
    amount, setAmount,
    selectedCategory, setSelectedCategory,
    date, setDate,
    note, setNote,
    entryType, setEntryType,
    loading,
    status,
    shakeAnim,
    submit,
    lastAdded,
  } = useTransaction();
  const { data } = useBudget();

  const cat = selectedCategory ? CATEGORY_BY_COL[selectedCategory] : null;
  const parsed = parseFloat(amount);
  const hasAmount = !isNaN(parsed) && parsed > 0;
  const isIncome = entryType === "income";
  const quick = isIncome ? INCOME_QUICK : SPEND_QUICK;
  const glow = isIncome ? "#7DF9C2" : (cat?.color ?? "#7DF9C2");

  const switchType = (next: EntryType) => {
    Haptics.selectionAsync().catch(() => {});
    setEntryType(next);
    if (next === "income") setSelectedCategory(null);
  };

  const preview = useMemo(() => {
    if (!data || !hasAmount) return null;
    if (isIncome) {
      const current = data.remaining;
      return { kind: "income" as const, current, next: current + parsed * 0.8 };
    }
    if (!cat) return null;
    const spent = (data.breakdown as Record<string, number>)[cat.key] ?? 0;
    const bucket = cat.bucket === "needs" ? data.buckets?.needs : data.buckets?.wants;
    const bucketRemaining = bucket?.remaining ?? 0;
    return {
      kind: "spend" as const,
      spent,
      next: spent + parsed,
      bucketLabel: cat.bucket === "needs" ? "Needs" : "Wants",
      bucketRemaining,
      bucketNext: bucketRemaining - parsed,
    };
  }, [cat, data, hasAmount, parsed, isIncome]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <AmbientGlow color={glow} intensity="strong" />

      <FadeSlideIn delay={0}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{isIncome ? "New Income" : "New Entry"}</Text>
          <Text style={styles.title}>Add</Text>
        </View>
      </FadeSlideIn>

      <FadeSlideIn delay={40}>
        <View style={styles.typeRow}>
          <PressScale
            scaleTo={0.96}
            onPress={() => switchType("spend")}
            style={[styles.typeChip, !isIncome && styles.typeChipOn]}
          >
            <Text style={[styles.typeText, !isIncome && styles.typeTextOn]}>Purchase</Text>
          </PressScale>
          <PressScale
            scaleTo={0.96}
            onPress={() => switchType("income")}
            style={[styles.typeChip, isIncome && styles.typeChipOn]}
          >
            <Text style={[styles.typeText, isIncome && styles.typeTextOn]}>Income</Text>
          </PressScale>
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
          <View style={[styles.amountContainer, (cat || isIncome) && { borderColor: glow }]}>
            <Text style={[styles.currencySymbol, (cat || isIncome) && { color: glow }]}>$</Text>
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
          {quick.map((n) => (
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
        <Text style={styles.sectionLabel}>Day</Text>
        <DayPicker date={date} onChange={setDate} />
      </FadeSlideIn>

      <FadeSlideIn delay={180}>
        <Text style={styles.sectionLabel}>Note</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Optional — saved as a comment on the cell"
          placeholderTextColor="#444"
          selectionColor="#7DF9C2"
          multiline
          maxLength={500}
        />
      </FadeSlideIn>

      {!isIncome && (
        <FadeSlideIn delay={200}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((item) => {
              const isSelected = selectedCategory === item.col;
              return (
                <PressScale
                  key={item.col}
                  scaleTo={0.96}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} category`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedCategory(item.col);
                  }}
                  style={[
                    styles.categoryButton,
                    isSelected && { borderColor: item.color, backgroundColor: `${item.color}18` },
                  ]}
                >
                  <CategoryIcon name={item.icon} color={item.color} />
                  <Text style={[styles.categoryLabel, isSelected && { color: item.color, fontFamily: "PoppinsBold" }]}>
                    {item.label}
                  </Text>
                </PressScale>
              );
            })}
          </View>
        </FadeSlideIn>
      )}

      {preview && preview.kind === "spend" && cat && (
        <Reanimated.View
          entering={FadeIn.duration(280)}
          style={[styles.preview, { borderColor: cat.color }]}
        >
          <CategoryIcon name={cat.icon} color={cat.color} />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>{cat.label} this month</Text>
            <Text style={styles.previewLine}>
              {fmt(preview.spent)}
              {hasAmount ? `  →  ${fmt(preview.next)}` : ""}
            </Text>
            <Text style={styles.previewBucket}>
              {preview.bucketLabel} left {fmt(preview.bucketRemaining)}
              {hasAmount ? `  →  ${fmt(preview.bucketNext)}` : ""}
            </Text>
          </View>
        </Reanimated.View>
      )}

      {preview && preview.kind === "income" && (
        <Reanimated.View
          entering={FadeIn.duration(280)}
          style={[styles.preview, { borderColor: "#7DF9C2" }]}
        >
          <CategoryIcon name="account-balance-wallet" color="#7DF9C2" />
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>Left after 50 / 30 / 20</Text>
            <Text style={styles.previewLine}>
              {fmt(preview.current)}  →  {fmt(preview.next)}
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
          style={[styles.submitButton, (cat || isIncome) && { backgroundColor: glow }]}
        >
          {loading
            ? <ActivityIndicator color="#0D0D0F" />
            : <Text style={styles.submitLabel}>
                {hasAmount && isIncome
                  ? `Add ${fmt(parsed)} income`
                  : hasAmount && cat
                    ? `Add ${fmt(parsed)} to ${cat.label}`
                    : isIncome
                      ? "Add Income"
                      : "Add Transaction"}
              </Text>
          }
        </PressScale>
      </FadeSlideIn>

    </ScrollView>
  );
}

function DayPicker({
  date,
  onChange,
}: {
  date: Date;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = startOfDay(new Date());
  const selected = startOfDay(date);
  const isToday = isSameDay(selected, today);
  const yesterday = addDays(today, -1);

  const pick = (d: Date) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(startOfDay(d));
    setOpen(false);
  };

  return (
    <View style={styles.dayWrap}>
      <PressScale
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setOpen((v) => !v);
        }}
        style={[styles.dayCenter, open && styles.dayCenterOn]}
      >
        <View style={styles.dayCenterRow}>
          <Text style={styles.dateButtonEmoji}>📅</Text>
          <Text style={styles.dateButtonText}>{formatDate(selected)}</Text>
          <Text style={[styles.dateChevron, open && styles.dateChevronOn]}>{open ? "⌃" : "›"}</Text>
        </View>
      </PressScale>

      <View style={styles.dayChips}>
        {!isSameDay(selected, yesterday) && (
          <PressScale onPress={() => pick(yesterday)} style={styles.dayChip}>
            <Text style={styles.dayChipText}>Yesterday</Text>
          </PressScale>
        )}
        {!isToday && (
          <PressScale onPress={() => pick(today)} style={[styles.dayChip, styles.dayChipOn]}>
            <Text style={[styles.dayChipText, styles.dayChipTextOn]}>Today</Text>
          </PressScale>
        )}
      </View>

      {open && (
        <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)}>
          <CalendarPicker date={selected} onChange={pick} maximumDate={today} />
        </Reanimated.View>
      )}
    </View>
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
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  typeChip: {
    flex: 1,
    backgroundColor: "#16161A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 10,
    alignItems: "center",
  },
  typeChipOn: { borderColor: "#7DF9C2", backgroundColor: "#0D2A1F" },
  typeText: { fontFamily: "PoppinsBold", fontSize: 13, color: "#888" },
  typeTextOn: { color: "#7DF9C2" },
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
  dayWrap: { marginBottom: 20 },
  dayCenter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16161A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 10,
  },
  dayCenterOn: { borderColor: "#7DF9C2" },
  dayCenterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateButtonEmoji: { fontSize: 18 },
  dateButtonText: { flex: 1, fontFamily: "Poppins", fontSize: 15, color: "#AAA" },
  dateChevron: { fontSize: 22, color: "#444", marginTop: -2 },
  dateChevronOn: { color: "#7DF9C2" },
  dayChips: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dayChip: {
    backgroundColor: "#16161A",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dayChipOn: { borderColor: "#7DF9C2", backgroundColor: "#0D2A1F" },
  dayChipText: { fontFamily: "PoppinsBold", fontSize: 12, color: "#888" },
  dayChipTextOn: { color: "#7DF9C2" },
  noteInput: {
    backgroundColor: "#16161A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#F0F0F0",
    fontFamily: "Poppins",
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 24,
  },
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
