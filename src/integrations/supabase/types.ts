export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      arbitrage_opportunities: {
        Row: {
          buy_exchange: string
          created_at: string
          estimated_profit: string
          id: string
          network: string
          price_diff: number
          risk: string
          sell_exchange: string
          status: string
          token_pair: string
          updated_at: string
        }
        Insert: {
          buy_exchange: string
          created_at?: string
          estimated_profit: string
          id?: string
          network: string
          price_diff: number
          risk: string
          sell_exchange: string
          status?: string
          token_pair: string
          updated_at?: string
        }
        Update: {
          buy_exchange?: string
          created_at?: string
          estimated_profit?: string
          id?: string
          network?: string
          price_diff?: number
          risk?: string
          sell_exchange?: string
          status?: string
          token_pair?: string
          updated_at?: string
        }
        Relationships: []
      }
      arbitrage_routes: {
        Row: {
          created_at: string | null
          estimated_profit: number | null
          id: string
          net_profit: number | null
          network_fee_estimate: number | null
          opportunity_id: string | null
          route_steps: Json
          service_fee: number | null
          total_fee_estimate: number | null
          trading_fee_estimate: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_profit?: number | null
          id?: string
          net_profit?: number | null
          network_fee_estimate?: number | null
          opportunity_id?: string | null
          route_steps: Json
          service_fee?: number | null
          total_fee_estimate?: number | null
          trading_fee_estimate?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_profit?: number | null
          id?: string
          net_profit?: number | null
          network_fee_estimate?: number | null
          opportunity_id?: string | null
          route_steps?: Json
          service_fee?: number | null
          total_fee_estimate?: number | null
          trading_fee_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "arbitrage_routes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "arbitrage_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      arbitrage_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          fee_paid: number | null
          id: string
          status: string
          subscription_end: string | null
          subscription_start: string | null
          token_pair: string
          user_id: string | null
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          fee_paid?: number | null
          id?: string
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          token_pair: string
          user_id?: string | null
          wallet_address: string
          wallet_type: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fee_paid?: number | null
          id?: string
          status?: string
          subscription_end?: string | null
          subscription_start?: string | null
          token_pair?: string
          user_id?: string | null
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: []
      }
      crypto_payments: {
        Row: {
          amount: string
          created_at: string
          id: string
          payment_type: string
          status: string
          subscription_id: string | null
          token: string
          tx_hash: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          amount: string
          created_at?: string
          id?: string
          payment_type: string
          status?: string
          subscription_id?: string | null
          token: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address: string
          wallet_type: string
        }
        Update: {
          amount?: string
          created_at?: string
          id?: string
          payment_type?: string
          status?: string
          subscription_id?: string | null
          token?: string
          tx_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "arbitrage_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      dex_price_history: {
        Row: {
          chain_id: number
          dex_name: string
          id: string
          price: number
          timestamp: string
          token_pair: string
        }
        Insert: {
          chain_id: number
          dex_name: string
          id?: string
          price: number
          timestamp?: string
          token_pair: string
        }
        Update: {
          chain_id?: number
          dex_name?: string
          id?: string
          price?: number
          timestamp?: string
          token_pair?: string
        }
        Relationships: []
      }
      dex_settings: {
        Row: {
          api_key: string | null
          api_url: string | null
          chain_ids: number[]
          created_at: string
          enabled: boolean
          id: string
          name: string
          rate_limit_per_second: number | null
          slug: string
          trading_fee_percentage: number
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          chain_ids: number[]
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          rate_limit_per_second?: number | null
          slug: string
          trading_fee_percentage?: number
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          chain_ids?: number[]
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          rate_limit_per_second?: number | null
          slug?: string
          trading_fee_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          created_at: string | null
          fee_type: string
          id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          fee_type: string
          id?: string
          updated_at?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          fee_type?: string
          id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
      }
      gas_fees: {
        Row: {
          base_fee: number
          compute_units: number | null
          created_at: string
          id: string
          is_lamports: boolean | null
          network: string
          priority_fee: number | null
          updated_at: string
        }
        Insert: {
          base_fee: number
          compute_units?: number | null
          created_at?: string
          id?: string
          is_lamports?: boolean | null
          network: string
          priority_fee?: number | null
          updated_at?: string
        }
        Update: {
          base_fee?: number
          compute_units?: number | null
          created_at?: string
          id?: string
          is_lamports?: boolean | null
          network?: string
          priority_fee?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      price_data: {
        Row: {
          id: string
          price: number
          source: string
          timestamp: string
          token_pair: string
        }
        Insert: {
          id?: string
          price: number
          source: string
          timestamp?: string
          token_pair: string
        }
        Update: {
          id?: string
          price?: number
          source?: string
          timestamp?: string
          token_pair?: string
        }
        Relationships: []
      }
      scan_settings: {
        Row: {
          created_at: string
          gas_fee_threshold: number
          id: number
          profit_threshold: number
          scan_interval: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gas_fee_threshold?: number
          id?: number
          profit_threshold?: number
          scan_interval?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gas_fee_threshold?: number
          id?: number
          profit_threshold?: number
          scan_interval?: number
          updated_at?: string
        }
        Relationships: []
      }
      token_approvals: {
        Row: {
          amount: string
          created_at: string
          id: string
          spender_address: string
          status: string
          token_address: string
          tx_hash: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          amount: string
          created_at?: string
          id?: string
          spender_address: string
          status?: string
          token_address: string
          tx_hash?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          amount?: string
          created_at?: string
          id?: string
          spender_address?: string
          status?: string
          token_address?: string
          tx_hash?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      token_prices: {
        Row: {
          id: string
          price_usd: number
          source: string
          timestamp: string | null
          token_id: string | null
        }
        Insert: {
          id?: string
          price_usd: number
          source: string
          timestamp?: string | null
          token_id?: string | null
        }
        Update: {
          id?: string
          price_usd?: number
          source?: string
          timestamp?: string | null
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_prices_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          address: string
          chain_id: number
          created_at: string | null
          decimals: number | null
          id: string
          is_popular: boolean | null
          is_verified: boolean | null
          last_updated: string | null
          logo_uri: string | null
          market_cap: number | null
          name: string
          price_usd: number | null
          symbol: string
        }
        Insert: {
          address: string
          chain_id: number
          created_at?: string | null
          decimals?: number | null
          id?: string
          is_popular?: boolean | null
          is_verified?: boolean | null
          last_updated?: string | null
          logo_uri?: string | null
          market_cap?: number | null
          name: string
          price_usd?: number | null
          symbol: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string | null
          decimals?: number | null
          id?: string
          is_popular?: boolean | null
          is_verified?: boolean | null
          last_updated?: string | null
          logo_uri?: string | null
          market_cap?: number | null
          name?: string
          price_usd?: number | null
          symbol?: string
        }
        Relationships: []
      }
      trade_metrics: {
        Row: {
          created_at: string
          error: string | null
          execution_time_ms: number
          id: string
          profit_percentage: number | null
          success: boolean
          trade_id: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          execution_time_ms: number
          id?: string
          profit_percentage?: number | null
          success?: boolean
          trade_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          execution_time_ms?: number
          id?: string
          profit_percentage?: number | null
          success?: boolean
          trade_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_metrics_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trading_activity"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_activity: {
        Row: {
          amount: number
          created_at: string
          details: Json | null
          fee_amount: number | null
          fee_token: string | null
          id: string
          network_type: string | null
          price: number
          status: string
          strategy: string
          token_pair: string
          tx_hash: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          details?: Json | null
          fee_amount?: number | null
          fee_token?: string | null
          id?: string
          network_type?: string | null
          price: number
          status?: string
          strategy: string
          token_pair: string
          tx_hash?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          details?: Json | null
          fee_amount?: number | null
          fee_token?: string | null
          id?: string
          network_type?: string | null
          price?: number
          status?: string
          strategy?: string
          token_pair?: string
          tx_hash?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
