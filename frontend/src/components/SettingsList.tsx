import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { DURATION, SPRING_SNAPPY } from "../lib/motion";
import { FadeInView } from "./Motion";

// Shared building blocks for the Settings / Account / Notifications sheets: iOS-style grouped
// lists — a small uppercase caption above one rounded card whose rows are split by hairlines.

export function SettingsSection({
  title,
  footer,
  index = 0,
  children,
}: {
  title?: string;
  footer?: string;
  /** Position among sibling sections — staggers their entrance when a sheet/page opens. */
  index?: number;
  children: ReactNode;
}) {
  // Filter out `false`/`null` from conditional rows so they don't leave a stray divider.
  const rows = Children.toArray(children);
  return (
    <FadeInView index={index} baseDelay={60}>
      <View className="gap-1.5">
        {title && <Text className="px-1 text-xs font-medium uppercase tracking-wide text-white/50">{title}</Text>}
        <View className="overflow-hidden rounded-2xl bg-white/10">
          {rows.map((row, i) => (
            <Fragment key={i}>
              {i > 0 && <View className="ml-14 h-px bg-white/10" />}
              {row}
            </Fragment>
          ))}
        </View>
        {footer && <Text className="px-1 text-xs leading-4 text-white/40">{footer}</Text>}
      </View>
    </FadeInView>
  );
}

function IconTile({ icon: Icon, tint }: { icon: LucideIcon; tint?: string }) {
  return (
    <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/10">
      <Icon size={16} color={tint ?? "white"} />
    </View>
  );
}

/** Red unread-count pill. Pops in (a real state change worth noticing); renders nothing at 0. */
export function UnreadBadge({ count, accessibilityLabel }: { count: number; accessibilityLabel?: string }) {
  if (count <= 0) return null;
  return (
    <Animated.View
      entering={ZoomIn.duration(DURATION.base)}
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 5,
        backgroundColor: "#ef4444", // red-500
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text className="text-[11px] font-bold text-white">{count > 9 ? "9+" : count}</Text>
    </Animated.View>
  );
}

export function SettingsRow({
  icon,
  iconTint,
  label,
  sublabel,
  value,
  badge,
  trailing,
  onPress,
  disabled,
  destructive,
  showChevron,
}: {
  icon?: LucideIcon;
  iconTint?: string;
  label: string;
  sublabel?: string;
  value?: string;
  /** Unread count shown as a red pill before the chevron. */
  badge?: number;
  /** Replaces the default value + chevron on the right, e.g. a Toggle or SegmentedControl. */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** Defaults to true for pressable rows with no custom trailing element. */
  showChevron?: boolean;
}) {
  const chevron = showChevron ?? (!!onPress && !trailing);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      className="min-h-[52px] flex-row items-center gap-3 px-3 py-2.5 active:bg-white/5"
    >
      {icon && <IconTile icon={icon} tint={destructive ? "#fca5a5" : iconTint} />}
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${destructive ? "text-red-300" : disabled ? "text-white/50" : "text-white"}`}
        >
          {label}
        </Text>
        {sublabel && <Text className="mt-0.5 text-xs leading-4 text-white/50">{sublabel}</Text>}
      </View>
      {trailing ?? (
        <View className="flex-row items-center gap-1.5">
          {value && <Text className="text-sm text-white/60">{value}</Text>}
          {!!badge && <UnreadBadge count={badge} />}
          {chevron && <ChevronRight size={16} color="rgba(255,255,255,0.6)" />}
        </View>
      )}
    </Pressable>
  );
}

// Same pill switch the app has always used, now animated: the knob springs across and the track
// colour blends, so the state change reads as physical rather than a hard swap. Hand-rolled (not
// RN's Switch) so it matches the glass theme on both platforms.
const TRACK_W = 36;
const KNOB = 20;
const TRACK_OFF = "rgba(255,255,255,0.2)";
const TRACK_ON = "#38bdf8"; // sky-400

export function Toggle({
  on,
  onToggle,
  disabled,
  accessibilityLabel,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const progress = useSharedValue(on ? 1 : 0);

  useEffect(() => {
    progress.set(withSpring(on ? 1 : 0, SPRING_SNAPPY));
  }, [on, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [TRACK_OFF, TRACK_ON]),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (TRACK_W - KNOB) }],
  }));

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[{ width: TRACK_W, height: KNOB, borderRadius: KNOB / 2 }, trackStyle]}>
        <Animated.View
          style={[{ width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: "white" }, knobStyle]}
        />
      </Animated.View>
    </Pressable>
  );
}

// Segments keep their natural widths (EN vs ไทย differ), so the sliding highlight measures each
// one and springs both its position and width to the selected segment.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  fill,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Stretch segments to the full width (for a standalone control rather than a row trailer). */
  fill?: boolean;
}) {
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const visible = useSharedValue(0);
  const placed = useRef(false);

  const target = value != null ? layouts[value] : undefined;

  useEffect(() => {
    if (!target) {
      // No match (e.g. custom thresholds that aren't a preset) — fade the highlight out in place.
      visible.set(withTiming(0, { duration: DURATION.fast }));
      return;
    }
    if (!placed.current) {
      // First placement jumps straight there; sliding in from x=0 on mount would look like a glitch.
      x.set(target.x);
      width.set(target.width);
      placed.current = true;
    } else {
      x.set(withSpring(target.x, SPRING_SNAPPY));
      width.set(withSpring(target.width, SPRING_SNAPPY));
    }
    visible.set(withTiming(1, { duration: DURATION.fast }));
  }, [target, x, width, visible]);

  const highlightStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: visible.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View className={`flex-row rounded-lg bg-black/20 p-0.5 ${fill ? "w-full" : ""} ${disabled ? "opacity-50" : ""}`}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 2,
            bottom: 2,
            left: 0,
            borderRadius: 6,
            backgroundColor: "rgba(56,189,248,0.3)",
          },
          highlightStyle,
        ]}
      />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            onLayout={(e) => {
              const { x: segX, width: segW } = e.nativeEvent.layout;
              setLayouts((prev) =>
                prev[opt.value]?.x === segX && prev[opt.value]?.width === segW
                  ? prev
                  : { ...prev, [opt.value]: { x: segX, width: segW } },
              );
            }}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            className={`items-center rounded-md px-3 py-1.5 ${fill ? "flex-1" : ""}`}
          >
            <Text className={`text-xs font-medium ${selected ? "text-white" : "text-white/60"}`}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
