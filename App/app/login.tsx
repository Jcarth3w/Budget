import React, { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/utils/api";
import { FadeSlideIn, PressScale } from "@/components/motion";

export default function LoginScreen() {
  const { user, ready, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ registrationOpen?: boolean }>("/auth/status")
      .then((status) => {
        const open = status.registrationOpen === true;
        setRegistrationOpen(open);
        if (open) setMode("register");
      })
      .catch(() => {
        setRegistrationOpen(false);
      });
  }, []);

  if (!ready) {
    return (
      <KeyboardAvoidingView style={styles.flex}>
        <ActivityIndicator color="#7DF9C2" style={{ marginTop: 120 }} />
      </KeyboardAvoidingView>
    );
  }
  if (user) return <Redirect href="/" />;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <FadeSlideIn delay={0}>
          <Text style={styles.eyebrow}>Budget</Text>
          <Text style={styles.title}>{mode === "login" ? "Sign in" : "Create account"}</Text>
          <Text style={styles.subtitle}>
            {mode === "login"
              ? "This instance is just for you. Use the email and password you created on first setup."
              : "One-time setup. After this, only this account can sign in. Password must be 8+ characters."}
          </Text>
        </FadeSlideIn>

        <FadeSlideIn delay={80}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#555"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "login" ? "password" : "new-password"}
            placeholder="••••••••"
            placeholderTextColor="#555"
          />
        </FadeSlideIn>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FadeSlideIn delay={140}>
          <PressScale onPress={submit} disabled={loading} style={styles.submit}>
            {loading ? (
              <ActivityIndicator color="#0D0D0F" />
            ) : (
              <Text style={styles.submitLabel}>
                {mode === "login" ? "Sign in" : "Create account"}
              </Text>
            )}
          </PressScale>
          {registrationOpen ? (
            <PressScale
              onPress={() => {
                setError(null);
                setMode(mode === "login" ? "register" : "login");
              }}
              style={styles.switchBtn}
            >
              <Text style={styles.switchText}>
                {mode === "login" ? "First time? Create the owner account" : "Already set up? Sign in"}
              </Text>
            </PressScale>
          ) : null}
        </FadeSlideIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0D0D0F" },
  scroll: { flex: 1, backgroundColor: "#0D0D0F" },
  container: { padding: 24, paddingTop: 80, paddingBottom: 48 },
  eyebrow: {
    fontFamily: "Poppins",
    fontSize: 13,
    color: "#555",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: { fontFamily: "PoppinsBold", fontSize: 40, color: "#F0F0F0", lineHeight: 46, marginBottom: 10 },
  subtitle: { fontFamily: "Poppins", fontSize: 15, color: "#888", marginBottom: 32, lineHeight: 22 },
  label: {
    fontFamily: "PoppinsBold",
    fontSize: 12,
    color: "#666",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#16161A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222",
    color: "#F0F0F0",
    fontFamily: "Poppins",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  error: { fontFamily: "Poppins", fontSize: 14, color: "#FF6B6B", marginBottom: 16 },
  submit: {
    backgroundColor: "#7DF9C2",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  submitLabel: { fontFamily: "PoppinsBold", fontSize: 16, color: "#0D0D0F" },
  switchBtn: { paddingVertical: 18, alignItems: "center" },
  switchText: { fontFamily: "Poppins", fontSize: 14, color: "#7DF9C2" },
});
