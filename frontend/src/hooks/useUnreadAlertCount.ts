import { useQuery } from "@tanstack/react-query";
import { fetchUnreadAlertCount } from "../api/alertHistory";
import { useAuth } from "../context/AuthContext";

// Count behind the red unread badge. Refreshes on app open / return to foreground (focusManager in
// _layout.tsx), when a push lands while the app is open (also _layout.tsx), and once a minute.
export function useUnreadAlertCount() {
  const { user } = useAuth();
  const { data = 0 } = useQuery({
    queryKey: ["alertHistory", "unread", user?.id],
    queryFn: fetchUnreadAlertCount,
    enabled: !!user,
    refetchInterval: 60_000,
  });
  return user ? data : 0;
}
