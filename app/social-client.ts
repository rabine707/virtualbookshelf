import { SUPABASE_KEY, SUPABASE_URL, readStoredShelfSession } from "./auth-client";

export type SocialProfile = {
  id?: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  favorite_genres?: string[];
  trusted_curator?: boolean;
  followers?: number;
  following?: number;
  is_following?: boolean;
  is_self?: boolean;
};

export type SocialProfilePage = { profiles: SocialProfile[]; next_offset: number | null };

export type ActivityPrivacy = {
  shelf_public: boolean;
  activity_sharing_enabled: boolean;
  activity_share_added: boolean;
  activity_share_finished: boolean;
  activity_share_rated: boolean;
  activity_share_favorited: boolean;
};

export type ReaderActivity = {
  id: number;
  event_type: "added" | "finished" | "rated" | "favorited";
  rating?: number | null;
  created_at: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  book_title: string;
  book_author: string;
  cover_url?: string | null;
};

export type ReaderActivityPage = {
  events: ReaderActivity[];
  next_offset: number | null;
  unread_activity: number;
  new_followers: number;
  preferences: ActivityPrivacy;
};

async function socialRpc<T>(name: string, body: Record<string, unknown>) {
  const session = readStoredShelfSession();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("The reader community is temporarily unavailable.");
  return await response.json() as T;
}

export function discoverReaders(query = "", offset = 0, limit = 24) {
  return socialRpc<SocialProfilePage>("discover_public_profiles", { p_query: query, p_offset: offset, p_limit: limit });
}

export function listConnections(username: string, kind: "followers" | "following", offset = 0, limit = 30) {
  return socialRpc<SocialProfilePage>("list_profile_connections", { p_username: username, p_kind: kind, p_offset: offset, p_limit: limit });
}

export function setReaderFollow(username: string, follow: boolean) {
  return socialRpc<Record<string, unknown>>("set_profile_follow", { p_username: username, p_follow: follow });
}

export function loadReaderActivity(offset = 0, limit = 20) {
  return socialRpc<ReaderActivityPage>("get_reader_activity_feed", { p_offset: offset, p_limit: limit });
}

export function updateActivityPrivacy(preferences: Omit<ActivityPrivacy, "shelf_public">) {
  return socialRpc<ActivityPrivacy>("update_activity_privacy", {
    p_enabled: preferences.activity_sharing_enabled,
    p_share_added: preferences.activity_share_added,
    p_share_finished: preferences.activity_share_finished,
    p_share_rated: preferences.activity_share_rated,
    p_share_favorited: preferences.activity_share_favorited,
  });
}

export function markReaderNotificationsSeen() {
  return socialRpc<null>("mark_reader_notifications_seen", {});
}
