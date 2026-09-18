import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { PressScale } from "@/components/motion";
import { formatMonthYear, isSameDay, startOfDay } from "@/utils/format";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthCells(year: number, month: number): (Date | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= lastDate; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weeksOf(cells: (Date | null)[]) {
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarPicker({
  date,
  onChange,
  maximumDate,
}: {
  date: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
}) {
  const max = startOfDay(maximumDate ?? new Date());
  const today = startOfDay(new Date());
  const selected = startOfDay(date);
  const selectedYear = selected.getFullYear();
  const selectedMonth = selected.getMonth();
  const [cursor, setCursor] = useState({
    year: selectedYear,
    month: selectedMonth,
  });

  useEffect(() => {
    setCursor({ year: selectedYear, month: selectedMonth });
  }, [selectedYear, selectedMonth]);

  const weeks = useMemo(
    () => weeksOf(monthCells(cursor.year, cursor.month)),
    [cursor.year, cursor.month]
  );
  const cursorMonth = new Date(cursor.year, cursor.month, 1);
  const maxMonth = new Date(max.getFullYear(), max.getMonth(), 1);
  const atMaxMonth = cursorMonth.getTime() >= maxMonth.getTime();

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    if (next.getTime() > maxMonth.getTime()) return;
    Haptics.selectionAsync().catch(() => {});
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <View style={styles.cal}>
      <View style={styles.calHeader}>
        <PressScale onPress={() => shiftMonth(-1)} style={styles.calNav}>
          <Text style={styles.calNavText}>‹</Text>
        </PressScale>
        <Text style={styles.calTitle}>{formatMonthYear(cursorMonth)}</Text>
        <PressScale
          onPress={() => shiftMonth(1)}
          disabled={atMaxMonth}
          style={[styles.calNav, atMaxMonth && styles.calNavOff]}
        >
          <Text style={[styles.calNavText, atMaxMonth && styles.calNavTextOff]}>›</Text>
        </PressScale>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((cell, di) => {
            if (!cell) return <View key={`e-${wi}-${di}`} style={styles.dayCell} />;
            const day = startOfDay(cell);
            const disabled = day.getTime() > max.getTime();
            const on = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            return (
              <PressScale
                key={day.toISOString()}
                disabled={disabled}
                scaleTo={0.88}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onChange(day);
                }}
                style={[
                  styles.dayCell,
                  isToday && !on && styles.dayToday,
                  on && styles.dayOn,
                  disabled && styles.dayOff,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    isToday && !on && styles.dayNumToday,
                    on && styles.dayNumOn,
                    disabled && styles.dayNumOff,
                  ]}
                >
                  {day.getDate()}
                </Text>
              </PressScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cal: {
    backgroundColor: "#16161A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    padding: 12,
    paddingBottom: 8,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  calNav: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  calNavOff: { opacity: 0.3 },
  calNavText: { fontFamily: "PoppinsBold", fontSize: 24, color: "#F0F0F0", marginTop: -2 },
  calNavTextOff: { color: "#444" },
  calTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "PoppinsBold",
    fontSize: 15,
    color: "#F0F0F0",
  },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontFamily: "PoppinsBold",
    fontSize: 11,
    color: "#555",
    letterSpacing: 0.5,
  },
  week: { flexDirection: "row" },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    margin: 2,
  },
  dayToday: { borderWidth: 1, borderColor: "#7DF9C2" },
  dayOn: { backgroundColor: "#7DF9C2" },
  dayOff: { opacity: 0.35 },
  dayNum: { fontFamily: "Poppins", fontSize: 14, color: "#AAA" },
  dayNumToday: { color: "#7DF9C2", fontFamily: "PoppinsBold" },
  dayNumOn: { color: "#0D0D0F", fontFamily: "PoppinsBold" },
  dayNumOff: { color: "#444" },
});
