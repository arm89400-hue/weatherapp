import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput } from "react-native";
import { GlassCard } from "../components/GlassCard";
import { LoadingText } from "../components/Motion";
import { ScreenBackground } from "../components/ScreenBackground";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/useTranslation";

export function RegisterScreen() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, name);
      router.replace("/");
    } catch (err: any) {
      setError(err?.response?.data?.error ?? t("register.errorFallback"));
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
          <Text className="mb-6 text-2xl font-semibold text-white">{t("register.title")}</Text>

          <Text className="mb-1 text-sm text-white/80">{t("register.name")}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("register.namePlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="mb-4 w-full rounded-xl bg-white/10 px-3 py-2 text-white"
          />

          <Text className="mb-1 text-sm text-white/80">{t("register.email")}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="mb-4 w-full rounded-xl bg-white/10 px-3 py-2 text-white"
          />

          <Text className="mb-1 text-sm text-white/80">{t("register.password")}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={t("register.passwordPlaceholder")}
            placeholderTextColor="rgba(255,255,255,0.5)"
            className="mb-4 w-full rounded-xl bg-white/10 px-3 py-2 text-white"
          />

          {error && <Text className="mb-4 text-sm text-red-300">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting || !name || !email || password.length < 8}
            className="w-full rounded-xl bg-sky-400/80 py-2 disabled:opacity-60"
          >
            {submitting ? (
              <LoadingText
                center
                text={t("register.submitting")}
                className="font-medium text-slate-900"
                dotColor="#0f172a"
              />
            ) : (
              <Text className="text-center font-medium text-slate-900">{t("register.submit")}</Text>
            )}
          </Pressable>

          <Text className="mt-4 text-center text-sm text-white/70">
            {t("register.haveAccount")}{" "}
            <Text className="underline" onPress={() => router.push("/login")}>
              {t("register.signIn")}
            </Text>
          </Text>
        </GlassCard>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
