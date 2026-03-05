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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["admin_role"]
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["admin_role"]
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          email: string
          failed_attempts: number
          full_name: string | null
          id: string
          last_login_at: string | null
          locked_until: string | null
          role: Database["public"]["Enums"]["admin_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          failed_attempts?: number
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          failed_attempts?: number
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          locked_until?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          meta: Json | null
          product_id: string | null
          product_name: string | null
          read: boolean
          severity: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          meta?: Json | null
          product_id?: string | null
          product_name?: string | null
          read?: boolean
          severity?: Database["public"]["Enums"]["alert_severity"]
          type: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          meta?: Json | null
          product_id?: string | null
          product_name?: string | null
          read?: boolean
          severity?: Database["public"]["Enums"]["alert_severity"]
          type?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          brand_color: string
          business_type: Database["public"]["Enums"]["business_type"]
          company_number: string | null
          country: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          custom_domain: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          status: string
          stripe_account_id: string | null
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          brand_color?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          company_number?: string | null
          country?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          brand_color?: string
          business_type?: Database["public"]["Enums"]["business_type"]
          company_number?: string | null
          country?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          custom_domain?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          status?: string
          stripe_account_id?: string | null
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_feature_flags: {
        Row: {
          company_id: string
          created_at: string
          enabled: boolean
          flag_id: string
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          enabled?: boolean
          flag_id: string
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          enabled?: boolean
          flag_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_flags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_feature_flags_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          outstanding_balance: number
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled_global: boolean
          flag_key: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_global?: boolean
          flag_key: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_global?: boolean
          flag_key?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          note: string | null
          product_id: string
          product_name: string
          qty: number
          type: Database["public"]["Enums"]["movement_type"]
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          note?: string | null
          product_id: string
          product_name: string
          qty: number
          type: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          note?: string | null
          product_id?: string
          product_name?: string
          qty?: number
          type?: Database["public"]["Enums"]["movement_type"]
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          qty: number
          total: number
          unit_price: number
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id?: string | null
          product_name: string
          qty?: number
          total?: number
          unit_price?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string | null
          product_name?: string
          qty?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          company_id: string
          created_at: string
          customer_id: string
          due_date: string
          id: string
          invoice_number: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          company_id: string
          created_at?: string
          customer_id: string
          due_date: string
          id?: string
          invoice_number: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          company_id?: string
          created_at?: string
          customer_id?: string
          due_date?: string
          id?: string
          invoice_number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          note: string | null
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          note?: string | null
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          note?: string | null
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          company_id: string
          cost_price: number
          created_at: string
          expiry_date: string | null
          id: string
          min_stock_level: number
          name: string
          profit_margin: number | null
          selling_price: number
          sku: string
          stock_qty: number
          supplier_id: string | null
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          company_id: string
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          min_stock_level?: number
          name: string
          profit_margin?: number | null
          selling_price?: number
          sku: string
          stock_qty?: number
          supplier_id?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          company_id?: string
          cost_price?: number
          created_at?: string
          expiry_date?: string | null
          id?: string
          min_stock_level?: number
          name?: string
          profit_margin?: number | null
          selling_price?: number
          sku?: string
          stock_qty?: number
          supplier_id?: string | null
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          channel: string
          id: string
          invoice_id: string
          note: string | null
          sent_at: string
        }
        Insert: {
          channel?: string
          id?: string
          invoice_id: string
          note?: string | null
          sent_at?: string
        }
        Update: {
          channel?: string
          id?: string
          invoice_id?: string
          note?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          line_total: number
          product_id: string | null
          product_name: string
          qty: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          line_total?: number
          product_id?: string | null
          product_name: string
          qty?: number
          sale_id: string
          unit_price?: number
        }
        Update: {
          id?: string
          line_total?: number
          product_id?: string | null
          product_name?: string
          qty?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          provider: string | null
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method: string
          provider?: string | null
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          provider?: string | null
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cashier_id: string
          cashier_name: string
          change_given: number
          company_id: string
          created_at: string
          discount: number
          id: string
          status: string
          subtotal: number
          tax: number
          total: number
        }
        Insert: {
          cashier_id: string
          cashier_name: string
          change_given?: number
          company_id: string
          created_at?: string
          discount?: number
          id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Update: {
          cashier_id?: string
          cashier_name?: string
          change_given?: number
          company_id?: string
          created_at?: string
          discount?: number
          id?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          expires_at: string | null
          id: string
          max_products: number
          max_users: number
          plan: Database["public"]["Enums"]["plan_tier"]
          started_at: string
        }
        Insert: {
          company_id: string
          expires_at?: string | null
          id?: string
          max_products?: number
          max_users?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
          started_at?: string
        }
        Update: {
          company_id?: string
          expires_at?: string | null
          id?: string
          max_products?: number
          max_users?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_cost: number
          old_cost: number
          product_id: string
          supplier_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_cost: number
          old_cost: number
          product_id: string
          supplier_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_cost?: number
          old_cost?: number
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          last_supply_date: string | null
          name: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_supply_date?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_supply_date?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_jobs_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          internal_notes: string | null
          job_type: string
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          internal_notes?: string | null
          job_type: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          internal_notes?: string | null
          job_type?: string
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          company_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          retries: number
          status: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider: string
          retries?: number
          status?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          retries?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      user_belongs_to_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      admin_role: "super_admin" | "support_admin"
      alert_severity: "warning" | "critical"
      alert_type: "LOW_STOCK" | "SUPPLIER_PRICE_CHANGE"
      app_role: "owner" | "manager" | "staff"
      business_type: "wholesale" | "retail" | "hybrid"
      currency_code:
        | "GBP"
        | "NGN"
        | "USD"
        | "EUR"
        | "CAD"
        | "GHS"
        | "KES"
        | "ZAR"
        | "INR"
        | "AED"
        | "AUD"
      invoice_status: "draft" | "sent" | "partially_paid" | "paid" | "overdue"
      movement_type: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "SALE"
      plan_tier: "starter" | "growth" | "pro"
      unit_type: "bag" | "carton" | "unit" | "kg" | "bottle" | "tin"
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
    Enums: {
      admin_role: ["super_admin", "support_admin"],
      alert_severity: ["warning", "critical"],
      alert_type: ["LOW_STOCK", "SUPPLIER_PRICE_CHANGE"],
      app_role: ["owner", "manager", "staff"],
      business_type: ["wholesale", "retail", "hybrid"],
      currency_code: [
        "GBP",
        "NGN",
        "USD",
        "EUR",
        "CAD",
        "GHS",
        "KES",
        "ZAR",
        "INR",
        "AED",
        "AUD",
      ],
      invoice_status: ["draft", "sent", "partially_paid", "paid", "overdue"],
      movement_type: ["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "SALE"],
      plan_tier: ["starter", "growth", "pro"],
      unit_type: ["bag", "carton", "unit", "kg", "bottle", "tin"],
    },
  },
} as const
