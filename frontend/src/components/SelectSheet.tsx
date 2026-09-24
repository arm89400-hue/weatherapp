import { Check, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n/useTranslation";
import { GlassCard } from "./GlassCard";
import { ModalBackdrop } from "./ModalBackdrop";

export type SelectSheetOption<T extends string = string> = { value: T; label: string };

type Row<T extends string> = { value: T | null; label: string };

type Props<T extends string = string> = {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SelectSheetOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Adds a leading row that commits `null` (e.g. LocationPicker's "All districts"). */
  nullable?: boolean;
  nullLabel?: string;
  filterable?: boolean;
};

// Virtualized FlatList with an optional filter, since a plain list isn't free at 77+ items
// (Thailand's provinces). Renders its own top-level Modal rather than nesting inside `Sheet` so
// it can be triggered from a row inside an already-open Sheet — stacked Modals render fine.
export function SelectSheet<T extends string = string>({
  open,
  onClose,
  title,
  options,
  value,
  onChange,
  nullable = false,
  nullLabel = "",
  filterable = true,
}: Props<T>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const rows: Row<T>[] = nullable ? [{ value: null, label: nullLabel }, ...filtered] : filtered;

  function commit(next: T | null) {
    onChange(next);
    setQuery("");
    onClose();
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      // No-op rather than onClose: the X button below is the only way to close this sheet, so
      // Android's hardware back button doesn't dismiss it out from under an in-progress pick.
      onRequestClose={() => {}}
      statusBarTranslucent
    >
      <ModalBackdrop>
        <GlassCard className="w-full rounded-t-3xl p-5" style={{ maxHeight: "80%", paddingBottom: insets.bottom + 24 }}>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-base font-semibold text-white">{title}</Text>
            <Pressable onPress={onClose} accessibilityLabel={t("common.close")} className="rounded-full p-1.5">
              <X size={16} color="white" />
            </Pressable>
          </View>

          {filterable && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("common.search")}
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="mb-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white"
            />
          )}

          <FlatList
            data={rows}
            keyExtractor={(item) => item.value ?? "__null__"}
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <Pressable
                  onPress={() => commit(item.value)}
                  className="flex-row items-center justify-between rounded-xl px-3 py-3 active:bg-white/10"
                >
                  <Text className="text-sm text-white">{item.label}</Text>
                  {selected && <Check size={16} color="#38bdf8" />}
                </Pressable>
              );
            }}
          />
        </GlassCard>
      </ModalBackdrop>
    </Modal>
  );
}
