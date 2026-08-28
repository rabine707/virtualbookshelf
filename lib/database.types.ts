export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      books: {
        Row: {
          asin: string | null
          author: string
          created_at: string
          id: string
          isbn: string | null
          normalized_author: string
          normalized_title: string
          title: string
        }
        Insert: {
          asin?: string | null
          author?: string
          created_at?: string
          id?: string
          isbn?: string | null
          normalized_author?: string
          normalized_title?: string
          title: string
        }
        Update: {
          asin?: string | null
          author?: string
          created_at?: string
          id?: string
          isbn?: string | null
          normalized_author?: string
          normalized_title?: string
          title?: string
        }
        Relationships: []
      }
      cover_candidate_votes: {
        Row: {
          candidate_id: string
          created_at: string
          user_id: string
          vote: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          user_id: string
          vote: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_candidate_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "cover_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_candidates: {
        Row: {
          book_id: string | null
          confidence: number
          correct_votes: number
          created_at: string
          different_edition_votes: number
          id: string
          image_sha256: string | null
          image_url: string
          source: string | null
          source_author: string | null
          source_identifier: string | null
          source_title: string | null
          status: string
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
          wrong_votes: number
        }
        Insert: {
          book_id?: string | null
          confidence?: number
          correct_votes?: number
          created_at?: string
          different_edition_votes?: number
          id?: string
          image_sha256?: string | null
          image_url: string
          source?: string | null
          source_author?: string | null
          source_identifier?: string | null
          source_title?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          wrong_votes?: number
        }
        Update: {
          book_id?: string | null
          confidence?: number
          correct_votes?: number
          created_at?: string
          different_edition_votes?: number
          id?: string
          image_sha256?: string | null
          image_url?: string
          source?: string | null
          source_author?: string | null
          source_identifier?: string | null
          source_title?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          wrong_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "cover_candidates_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_identifications: {
        Row: {
          author: string
          candidate_id: string
          created_at: string
          id: string
          normalized_author: string
          normalized_title: string
          title: string
          user_id: string
        }
        Insert: {
          author: string
          candidate_id: string
          created_at?: string
          id?: string
          normalized_author: string
          normalized_title: string
          title: string
          user_id: string
        }
        Update: {
          author?: string
          candidate_id?: string
          created_at?: string
          id?: string
          normalized_author?: string
          normalized_title?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_identifications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "cover_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_flounder_players: {
        Row: {
          coconuts_eaten: number
          current_dust: number
          first_seen: string
          food_eaten: number
          is_owner: boolean
          last_seen: string
          last_session_id: string | null
          lifetime_dust: number
          player_id: string
          potatoes_eaten: number
          sessions: number
        }
        Insert: {
          coconuts_eaten?: number
          current_dust?: number
          first_seen?: string
          food_eaten?: number
          is_owner?: boolean
          last_seen?: string
          last_session_id?: string | null
          lifetime_dust?: number
          player_id: string
          potatoes_eaten?: number
          sessions?: number
        }
        Update: {
          coconuts_eaten?: number
          current_dust?: number
          first_seen?: string
          food_eaten?: number
          is_owner?: boolean
          last_seen?: string
          last_session_id?: string | null
          lifetime_dust?: number
          player_id?: string
          potatoes_eaten?: number
          sessions?: number
        }
        Relationships: []
      }
      profile_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          favorite_genres: string[]
          id: string
          trusted_curator: boolean
          updated_at: string
          username: string
          username_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_genres?: string[]
          id: string
          trusted_curator?: boolean
          updated_at?: string
          username: string
          username_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_genres?: string[]
          id?: string
          trusted_curator?: boolean
          updated_at?: string
          username?: string
          username_changed_at?: string | null
        }
        Relationships: []
      }
      reader_activity_events: {
        Row: {
          actor_id: string
          book_id: string
          created_at: string
          event_type: string
          id: number
          rating: number | null
        }
        Insert: {
          actor_id: string
          book_id: string
          created_at?: string
          event_type: string
          id?: never
          rating?: number | null
        }
        Update: {
          actor_id?: string
          book_id?: string
          created_at?: string
          event_type?: string
          id?: never
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reader_activity_events_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      shelf_scan_usage: {
        Row: {
          passes: number
          updated_at: string
          usage_date: string
          user_id: string
        }
        Insert: {
          passes?: number
          updated_at?: string
          usage_date: string
          user_id: string
        }
        Update: {
          passes?: number
          updated_at?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      shelf_scans: {
        Row: {
          accepted_count: number
          created_at: string
          detected_books: Json
          detected_count: number
          id: string
          source_name: string | null
          status: string
          user_id: string
        }
        Insert: {
          accepted_count?: number
          created_at?: string
          detected_books?: Json
          detected_count?: number
          id?: string
          source_name?: string | null
          status?: string
          user_id?: string
        }
        Update: {
          accepted_count?: number
          created_at?: string
          detected_books?: Json
          detected_count?: number
          id?: string
          source_name?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      spine_generation_usage: {
        Row: {
          asin: string | null
          attempts: number
          author: string
          book_key: string
          created_at: string
          isbn: string | null
          last_generated_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asin?: string | null
          attempts?: number
          author?: string
          book_key: string
          created_at?: string
          isbn?: string | null
          last_generated_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asin?: string | null
          attempts?: number
          author?: string
          book_key?: string
          created_at?: string
          isbn?: string | null
          last_generated_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spine_requests: {
        Row: {
          asin: string | null
          author: string
          book_key: string
          cover_url: string | null
          created_at: string
          curator_note: string | null
          fulfilled_spine_id: string | null
          id: string
          isbn: string | null
          requested_by: string | null
          requester_ip_hash: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          asin?: string | null
          author?: string
          book_key: string
          cover_url?: string | null
          created_at?: string
          curator_note?: string | null
          fulfilled_spine_id?: string | null
          id?: string
          isbn?: string | null
          requested_by?: string | null
          requester_ip_hash?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          asin?: string | null
          author?: string
          book_key?: string
          cover_url?: string | null
          created_at?: string
          curator_note?: string | null
          fulfilled_spine_id?: string | null
          id?: string
          isbn?: string | null
          requested_by?: string | null
          requester_ip_hash?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spine_requests_fulfilled_spine_id_fkey"
            columns: ["fulfilled_spine_id"]
            isOneToOne: false
            referencedRelation: "spines"
            referencedColumns: ["id"]
          },
        ]
      }
      spine_votes: {
        Row: {
          created_at: string
          spine_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          spine_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          spine_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "spine_votes_spine_id_fkey"
            columns: ["spine_id"]
            isOneToOne: false
            referencedRelation: "spines"
            referencedColumns: ["id"]
          },
        ]
      }
      spines: {
        Row: {
          book_id: string
          contributed_by: string | null
          created_at: string
          id: string
          model: string | null
          provider: string | null
          source_cover_url: string | null
          status: string
          storage_path: string
          vote_score: number
        }
        Insert: {
          book_id: string
          contributed_by?: string | null
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          source_cover_url?: string | null
          status?: string
          storage_path: string
          vote_score?: number
        }
        Update: {
          book_id?: string
          contributed_by?: string | null
          created_at?: string
          id?: string
          model?: string | null
          provider?: string | null
          source_cover_url?: string | null
          status?: string
          storage_path?: string
          vote_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "spines_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          book_id: string
          client_key: string | null
          color: string | null
          cover_feedback: Json
          created_at: string
          favorite: boolean
          goodreads_shelf: string | null
          import_source: string | null
          preferred_cover_source: string | null
          preferred_cover_url: string | null
          published_year: string | null
          rating: number | null
          saved_covers: Json
          selected_spine_id: string | null
          shelf: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          client_key?: string | null
          color?: string | null
          cover_feedback?: Json
          created_at?: string
          favorite?: boolean
          goodreads_shelf?: string | null
          import_source?: string | null
          preferred_cover_source?: string | null
          preferred_cover_url?: string | null
          published_year?: string | null
          rating?: number | null
          saved_covers?: Json
          selected_spine_id?: string | null
          shelf?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          client_key?: string | null
          color?: string | null
          cover_feedback?: Json
          created_at?: string
          favorite?: boolean
          goodreads_shelf?: string | null
          import_source?: string | null
          preferred_cover_source?: string | null
          preferred_cover_url?: string | null
          published_year?: string | null
          rating?: number | null
          saved_covers?: Json
          selected_spine_id?: string | null
          shelf?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_selected_spine_id_fkey"
            columns: ["selected_spine_id"]
            isOneToOne: false
            referencedRelation: "spines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          activity_seen_at: string
          activity_share_added: boolean
          activity_share_favorited: boolean
          activity_share_finished: boolean
          activity_share_rated: boolean
          activity_sharing_enabled: boolean
          community_stars: number
          decor_active: Json
          decor_owned: Json
          followers_seen_at: string
          plan: string
          premium_themes: string[]
          profile_favorite_book_ids: string[]
          profile_favorites_style: string
          shelf_public: boolean
          spine_labels: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_seen_at?: string
          activity_share_added?: boolean
          activity_share_favorited?: boolean
          activity_share_finished?: boolean
          activity_share_rated?: boolean
          activity_sharing_enabled?: boolean
          community_stars?: number
          decor_active?: Json
          decor_owned?: Json
          followers_seen_at?: string
          plan?: string
          premium_themes?: string[]
          profile_favorite_book_ids?: string[]
          profile_favorites_style?: string
          shelf_public?: boolean
          spine_labels?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_seen_at?: string
          activity_share_added?: boolean
          activity_share_favorited?: boolean
          activity_share_finished?: boolean
          activity_share_rated?: boolean
          activity_sharing_enabled?: boolean
          community_stars?: number
          decor_active?: Json
          decor_owned?: Json
          followers_seen_at?: string
          plan?: string
          premium_themes?: string[]
          profile_favorite_book_ids?: string[]
          profile_favorites_style?: string
          shelf_public?: boolean
          spine_labels?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          affected_page: string | null
          category: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affected_page?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          affected_page?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_api_rate_limit: {
        Args: {
          p_bucket_key: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          request_count: number
          retry_after_seconds: number
        }[]
      }
      consume_shelf_scan_pass: {
        Args: { p_limit?: number }
        Returns: {
          allowed: boolean
          passes: number
          remaining: number
        }[]
      }
      consume_spine_generation_attempt: {
        Args: {
          p_asin?: string
          p_author: string
          p_book_key: string
          p_isbn?: string
          p_limit?: number
          p_title: string
        }
        Returns: {
          allowed: boolean
          attempts: number
          remaining: number
          shared_storage_path: string
        }[]
      }
      discover_public_profiles: {
        Args: { p_limit?: number; p_offset?: number; p_query?: string }
        Returns: Json
      }
      display_name_is_allowed: { Args: { value: string }; Returns: boolean }
      get_approved_cover_candidates: {
        Args: {
          p_asin?: string
          p_author?: string
          p_isbn?: string
          p_title?: string
        }
        Returns: {
          confidence: number
          correct_votes: number
          image_url: string
          source: string
        }[]
      }
      get_next_shelf_cover_candidate: {
        Args: { p_excluded_ids?: string[] }
        Returns: {
          author: string
          book_id: string
          id: string
          image_url: string
          source_author: string | null
          source_title: string | null
          status: string
          title: string
        }[]
      }
      get_approved_covers_for_library: {
        Args: { p_books: Json }
        Returns: {
          client_key: string
          confidence: number
          image_url: string
          source: string
        }[]
      }
      get_my_shelf: { Args: never; Returns: Json }
      get_profile_social: { Args: { p_username: string }; Returns: Json }
      get_public_shelf: { Args: { p_username: string }; Returns: Json }
      get_reader_activity_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      list_profile_connections: {
        Args: {
          p_kind: string
          p_limit?: number
          p_offset?: number
          p_username: string
        }
        Returns: Json
      }
      mark_reader_notifications_seen: { Args: never; Returns: undefined }
      normalize_book_answer: { Args: { value: string }; Returns: string }
      normalize_username: { Args: { value: string }; Returns: string }
      set_profile_follow: {
        Args: { p_follow: boolean; p_username: string }
        Returns: Json
      }
      submit_cover_identification: {
        Args: { p_author: string; p_candidate_id: string; p_title: string }
        Returns: undefined
      }
      submit_cover_vote: {
        Args: { p_candidate_id: string; p_vote: string }
        Returns: undefined
      }
      submit_user_cover_choice: {
        Args: {
          p_asin?: string
          p_author: string
          p_image_url: string
          p_isbn?: string
          p_source?: string
          p_title: string
        }
        Returns: {
          book_id: string
          candidate_id: string
          status: string
          trusted: boolean
        }[]
      }
      sync_my_shelf: {
        Args: { p_books: Json; p_replace?: boolean; p_settings?: Json }
        Returns: Json
      }
      update_activity_privacy: {
        Args: {
          p_enabled: boolean
          p_share_added: boolean
          p_share_favorited: boolean
          p_share_finished: boolean
          p_share_rated: boolean
        }
        Returns: Json
      }
      update_my_shelf_settings: { Args: { p_settings: Json }; Returns: Json }
      update_profile_favorites: {
        Args: { p_book_ids: string[]; p_style: string }
        Returns: Json
      }
      user_text_is_allowed: { Args: { value: string }; Returns: boolean }
      username_available: { Args: { candidate: string }; Returns: boolean }
      username_is_allowed: { Args: { value: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
