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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          meta: Json
          target: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          target?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          min_order: number
          percent_off: number
        }
        Insert: {
          active?: boolean
          code: string
          min_order?: number
          percent_off: number
        }
        Update: {
          active?: boolean
          code?: string
          min_order?: number
          percent_off?: number
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          change: number
          created_at: string
          id: string
          new_qty: number
          old_qty: number
          product_id: string | null
          product_name: string
          reason: string
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          change: number
          created_at?: string
          id?: string
          new_qty: number
          old_qty: number
          product_id?: string | null
          product_name: string
          reason: string
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          change?: number
          created_at?: string
          id?: string
          new_qty?: number
          old_qty?: number
          product_id?: string | null
          product_name?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string | null
          id: string
          image: string | null
          name: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          color?: string | null
          id?: string
          image?: string | null
          name: string
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          color?: string | null
          id?: string
          image?: string | null
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          field: string
          id: string
          new_value: string
          old_value: string | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          field: string
          id?: string
          new_value: string
          old_value?: string | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          field?: string
          id?: string
          new_value?: string
          old_value?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string
          coupon_code: string | null
          created_at: string
          discount: number
          id: string
          notes: string | null
          payment_method: string
          payment_status: string
          phone: string
          reference: string
          shipping: number
          shipping_name: string
          state: string
          status: string
          subtotal: number
          total: number
          user_id: string
        }
        Insert: {
          address: string
          city: string
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method: string
          payment_status?: string
          phone: string
          reference?: string
          shipping: number
          shipping_name: string
          state: string
          status?: string
          subtotal: number
          total: number
          user_id: string
        }
        Update: {
          address?: string
          city?: string
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          phone?: string
          reference?: string
          shipping?: number
          shipping_name?: string
          state?: string
          status?: string
          subtotal?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          brand: string
          category_id: string | null
          colors: string[]
          created_at: string
          description: string
          discount_price: number | null
          featured: boolean
          id: string
          images: string[]
          low_stock_threshold: number
          name: string
          price: number
          sku: string
          slug: string
          specs: Json
          stock: number
        }
        Insert: {
          active?: boolean
          brand?: string
          category_id?: string | null
          colors?: string[]
          created_at?: string
          description?: string
          discount_price?: number | null
          featured?: boolean
          id?: string
          images?: string[]
          low_stock_threshold?: number
          name: string
          price: number
          sku?: string
          slug: string
          specs?: Json
          stock?: number
        }
        Update: {
          active?: boolean
          brand?: string
          category_id?: string | null
          colors?: string[]
          created_at?: string
          description?: string
          discount_price?: number | null
          featured?: boolean
          id?: string
          images?: string[]
          low_stock_threshold?: number
          name?: string
          price?: number
          sku?: string
          slug?: string
          specs?: Json
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          disabled: boolean
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          disabled?: boolean
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          disabled?: boolean
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          author_name: string
          comment?: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_stock: {
        Args: { _new_qty: number; _product: string; _reason: string }
        Returns: undefined
      }
      admin_customers: {
        Args: never
        Returns: {
          created_at: string
          disabled: boolean
          email: string
          full_name: string
          id: string
          last_order: string
          last_sign_in: string
          order_count: number
          phone: string
          roles: string[]
          total_spent: number
        }[]
      }
      admin_set_customer_disabled: {
        Args: { _disabled: boolean; _uid: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: {
          _email: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      admin_staff: {
        Args: never
        Returns: {
          email: string
          full_name: string
          roles: string[]
          user_id: string
        }[]
      }
      check_coupon: {
        Args: { _code: string }
        Returns: {
          code: string
          min_order: number
          percent_off: number
        }[]
      }
      has_perm: { Args: { _perm: string; _uid: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      my_perms: { Args: never; Returns: string[] }
      place_order: {
        Args: {
          _coupon: string
          _items: Json
          _payment_method: string
          _ship: Json
        }
        Returns: {
          order_id: string
          order_reference: string
        }[]
      }
      write_audit: {
        Args: { _action: string; _meta: Json; _target: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "customer"
        | "super_admin"
        | "manager"
        | "product_manager"
        | "order_manager"
        | "support"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "customer",
        "super_admin",
        "manager",
        "product_manager",
        "order_manager",
        "support",
      ],
    },
  },
} as const
