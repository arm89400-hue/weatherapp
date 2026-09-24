import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from "react-native";
import { GlassCard } from "../components/GlassCard";
import { LoadingText } from "../components/Motion";
import { ScreenBackground } from "../components/ScreenBackground";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/useTranslation";

export function LoginScreen() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch {
      setError(t("login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center px-5"
      >
        <GlassCard className="w-full max-w-sm rounded-3xl p-8">
          <Text className="mb-6 text-2xl font-semibold text-white">{t("login.title")}</Text>

          <Text className="mb-1 text-sm text-white/80">{t("login.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="mb-4 w-full rounded-xl bg-white/10 px-3 py-2 text-white"
          />

          <Text className="mb-1 text-sm text-white/80">{t("login.password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="mb-4 w-full rounded-xl bg-white/10 px-3 py-2 text-white"
          />

          {error && <Text className="mb-4 text-sm text-red-300">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !email || !password}
            className="w-full rounded-xl bg-sky-400/80 py-2 disabled:opacity-60"
          >
            {submitting ? (
              <LoadingText
                center
                text={t("login.submitting")}
                className="font-medium text-slate-900"
                dotColor="#0f172a"
              />
            ) : (
              <Text className="text-center font-medium text-slate-900">{t("login.submit")}</Text>
            )}
          </Pressable>

          <Text className="mt-4 text-center text-sm text-white/70">
            {t("login.noAccount")}{" "}
            <Text className="underline" onPress={() => router.push("/register")}>
              {t("login.register")}
            </Text>
          </Text>
        </GlassCard>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
