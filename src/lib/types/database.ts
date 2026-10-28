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
      companies: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          subscription_plan: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          subscription_plan?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          subscription_plan?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          company_id: string | null
          cost: number | null
          created_at: string | null
          description: string | null
          files?: any | null
          id: string
          priority: string
          status: string
          tenant_id: string | null
          title: string
          unit_id: string | null
        }
        Insert: {
          company_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          files?: any | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string | null
          title: string
          unit_id?: string | null
        }
        Update: {
          company_id?: string | null
          cost?: number | null
          created_at?: string | null
          description?: string | null
          files?: any | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string | null
          title?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_notices: {
        Row: {
          company_id: string | null
          created_at: string | null
          deposit_refunded: number | null
          effective_exit_date: string
          id: string
          initiative: string
          lease_id: string | null
          notice_months: number
          notification_date: string
          reason: string | null
          repairs_deducted: number | null
          status: string
          tenant_id: string | null
          unit_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          deposit_refunded?: number | null
          effective_exit_date: string
          id?: string
          initiative: string
          lease_id?: string | null
          notice_months?: number
          notification_date: string
          reason?: string | null
          repairs_deducted?: number | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          deposit_refunded?: number | null
          effective_exit_date?: string
          id?: string
          initiative?: string
          lease_id?: string | null
          notice_months?: number
          notification_date?: string
          reason?: string | null
          repairs_deducted?: number | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_notices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_notices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_notices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_notices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          avance_months: number | null
          caution_months: number | null
          charges_amount: number | null
          company_id: string | null
          contract_pdf_url: string | null
          created_at: string | null
          deposit_amount: number
          end_date: string | null
          id: string
          rent_amount: number
          start_date: string
          status: string
          tenant_id: string | null
          unit_id: string | null
        }
        Insert: {
          avance_months?: number | null
          caution_months?: number | null
          charges_amount?: number | null
          company_id?: string | null
          contract_pdf_url?: string | null
          created_at?: string | null
          deposit_amount: number
          end_date?: string | null
          id?: string
          rent_amount: number
          start_date: string
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          avance_months?: number | null
          caution_months?: number | null
          charges_amount?: number | null
          company_id?: string | null
          contract_pdf_url?: string | null
          created_at?: string | null
          deposit_amount?: number
          end_date?: string | null
          id?: string
          rent_amount?: number
          start_date?: string
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          account_status: string | null
          address: string | null
          bank_details: string | null
          commission_rate: number | null
          company_id: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          id_card_number: string | null
          phone: string
          profile_id: string | null
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          bank_details?: string | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_card_number?: string | null
          phone: string
          profile_id?: string | null
        }
        Update: {
          account_status?: string | null
          address?: string | null
          bank_details?: string | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_card_number?: string | null
          phone?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string | null
          id: string
          lease_id: string | null
          payment_date: string
          payment_method: string
          period_month: string
          receipt_number: string | null
          receipt_pdf_url: string | null
          status: string
          tenant_id: string | null
          unit_id: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          lease_id?: string | null
          payment_date?: string
          payment_method: string
          period_month: string
          receipt_number?: string | null
          receipt_pdf_url?: string | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string | null
          id?: string
          lease_id?: string | null
          payment_date?: string
          payment_method?: string
          period_month?: string
          receipt_number?: string | null
          receipt_pdf_url?: string | null
          status?: string
          tenant_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          agency_commission: number
          company_id: string | null
          created_at: string | null
          gross_amount: number
          id: string
          net_amount: number
          owner_id: string | null
          payment_method: string
          period_month: string
          receipt_pdf_url: string | null
          repairs_deduction: number
        }
        Insert: {
          agency_commission?: number
          company_id?: string | null
          created_at?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          owner_id?: string | null
          payment_method: string
          period_month: string
          receipt_pdf_url?: string | null
          repairs_deduction?: number
          repairs_deducted?: number
        }
        Update: {
          agency_commission?: number
          company_id?: string | null
          created_at?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          owner_id?: string | null
          payment_method?: string
          period_month?: string
          receipt_pdf_url?: string | null
          repairs_deduction?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          permissions: any | null
          phone: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          permissions?: any | null
          phone?: string | null
          role: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          permissions?: any | null
          phone?: string | null
          role?: string
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
      properties: {
        Row: {
          address: string
          city: string | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string | null
          type: string
          units_count: number | null
        }
        Insert: {
          address: string
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          type: string
          units_count?: number | null
        }
        Update: {
          address?: string
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          type?: string
          units_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          emergency_contact: string | null
          full_name: string
          id: string
          id_card_number: string | null
          phone: string
          profession: string | null
          profile_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          id?: string
          id_card_number?: string | null
          phone: string
          profession?: string | null
          profile_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          id?: string
          id_card_number?: string | null
          phone?: string
          profession?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          charges_amount: number | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          property_id: string | null
          rent_amount: number
          status: string
          type: string
          unit_number: string
        }
        Insert: {
          charges_amount?: number | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          property_id?: string | null
          rent_amount: number
          status?: string
          type: string
          unit_number: string
        }
        Update: {
          charges_amount?: number | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          property_id?: string | null
          rent_amount?: number
          status?: string
          type?: string
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
  }
}
