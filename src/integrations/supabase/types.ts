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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ab_events: {
        Row: {
          created_at: string
          event_type: string
          experiment: string
          id: string
          language: string | null
          path: string | null
          session_id: string
          variant: string
        }
        Insert: {
          created_at?: string
          event_type: string
          experiment: string
          id?: string
          language?: string | null
          path?: string | null
          session_id: string
          variant: string
        }
        Update: {
          created_at?: string
          event_type?: string
          experiment?: string
          id?: string
          language?: string | null
          path?: string | null
          session_id?: string
          variant?: string
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          cost_delta: number
          created_at: string
          days_delta: number
          decided_at: string | null
          decided_by: string | null
          detail: string | null
          id: string
          project_id: string
          raised_on: string
          ref: string | null
          source: string | null
          status: Database["public"]["Enums"]["cr_status"]
          title: string
          updated_at: string
        }
        Insert: {
          cost_delta?: number
          created_at?: string
          days_delta?: number
          decided_at?: string | null
          decided_by?: string | null
          detail?: string | null
          id?: string
          project_id: string
          raised_on?: string
          ref?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["cr_status"]
          title: string
          updated_at?: string
        }
        Update: {
          cost_delta?: number
          created_at?: string
          days_delta?: number
          decided_at?: string | null
          decided_by?: string | null
          detail?: string | null
          id?: string
          project_id?: string
          raised_on?: string
          ref?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["cr_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "change_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      client_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          purpose: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          purpose: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          purpose?: string
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          edited_at: string | null
          id: string
          lead_id: string | null
          mentions: string[]
          project_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          lead_id?: string | null
          mentions?: string[]
          project_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          lead_id?: string | null
          mentions?: string[]
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          created_at: string
          created_by: string | null
          doc: Json
          id: string
          lead_id: string
          proposal_id: string | null
          source: string
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc?: Json
          id?: string
          lead_id: string
          proposal_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc?: Json
          id?: string
          lead_id?: string
          proposal_id?: string | null
          source?: string
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      design_images: {
        Row: {
          caption: string | null
          created_at: string
          design_id: string
          file_name: string | null
          height: number | null
          id: string
          kind: string
          room: string | null
          sort_order: number
          storage_path: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          design_id: string
          file_name?: string | null
          height?: number | null
          id?: string
          kind?: string
          room?: string | null
          sort_order?: number
          storage_path: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          design_id?: string
          file_name?: string | null
          height?: number | null
          id?: string
          kind?: string
          room?: string | null
          sort_order?: number
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "design_images_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          designer_id: string | null
          feedback: string | null
          id: string
          lead_id: string
          notes: string | null
          reject_reason: string | null
          status: Database["public"]["Enums"]["design_status"]
          submitted_at: string | null
          summary: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          designer_id?: string | null
          feedback?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["design_status"]
          submitted_at?: string | null
          summary?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          designer_id?: string | null
          feedback?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["design_status"]
          submitted_at?: string | null
          summary?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "designs_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "designs_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "designs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ffe_costing_private: {
        Row: {
          costing_id: string
          gm_notes: string | null
          markup_pct: number
          return_note: string | null
          updated_at: string
        }
        Insert: {
          costing_id: string
          gm_notes?: string | null
          markup_pct?: number
          return_note?: string | null
          updated_at?: string
        }
        Update: {
          costing_id?: string
          gm_notes?: string | null
          markup_pct?: number
          return_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ffe_costing_private_costing_id_fkey"
            columns: ["costing_id"]
            isOneToOne: true
            referencedRelation: "ffe_costings"
            referencedColumns: ["id"]
          },
        ]
      }
      ffe_costings: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          options: Json
          project_id: string | null
          quoted_at: string | null
          quoted_by: string | null
          status: Database["public"]["Enums"]["costing_status"]
          submitted_at: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          options?: Json
          project_id?: string | null
          quoted_at?: string | null
          quoted_by?: string | null
          status?: Database["public"]["Enums"]["costing_status"]
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          options?: Json
          project_id?: string | null
          quoted_at?: string | null
          quoted_by?: string | null
          status?: Database["public"]["Enums"]["costing_status"]
          submitted_at?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ffe_costings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ffe_costings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ffe_costings_quoted_by_fkey"
            columns: ["quoted_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ffe_item_costs: {
        Row: {
          item_id: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          item_id: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          item_id?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ffe_item_costs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "ffe_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ffe_items: {
        Row: {
          category: string | null
          created_at: string
          delivered_on: string | null
          dims: string | null
          eta: string | null
          finish: string | null
          id: string
          installed_on: string | null
          item: string
          lead_id: string | null
          notes: string | null
          ordered_on: string | null
          po_ref: string | null
          priority_band: number | null
          priority_band_manual: boolean
          product_url: string | null
          project_id: string | null
          qty: number
          ref: string | null
          room: string
          sku: string | null
          sort_order: number
          spec: string | null
          stage: Database["public"]["Enums"]["proc_stage"]
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          delivered_on?: string | null
          dims?: string | null
          eta?: string | null
          finish?: string | null
          id?: string
          installed_on?: string | null
          item: string
          lead_id?: string | null
          notes?: string | null
          ordered_on?: string | null
          po_ref?: string | null
          priority_band?: number | null
          priority_band_manual?: boolean
          product_url?: string | null
          project_id?: string | null
          qty?: number
          ref?: string | null
          room: string
          sku?: string | null
          sort_order?: number
          spec?: string | null
          stage?: Database["public"]["Enums"]["proc_stage"]
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          delivered_on?: string | null
          dims?: string | null
          eta?: string | null
          finish?: string | null
          id?: string
          installed_on?: string | null
          item?: string
          lead_id?: string | null
          notes?: string | null
          ordered_on?: string | null
          po_ref?: string | null
          priority_band?: number | null
          priority_band_manual?: boolean
          product_url?: string | null
          project_id?: string | null
          qty?: number
          ref?: string | null
          room?: string
          sku?: string | null
          sort_order?: number
          spec?: string | null
          stage?: Database["public"]["Enums"]["proc_stage"]
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ffe_items_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ffe_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ffe_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_items: {
        Row: {
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          label: string
          project_id: string
          sort_order: number
        }
        Insert: {
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label: string
          project_id: string
          sort_order: number
        }
        Update: {
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          label?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "handover_items_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "handover_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_forms: {
        Row: {
          budget_range: string
          client_type: string
          color_palette: string[] | null
          created_at: string
          design_style: string[] | null
          email: string
          id: string
          inspiration_links: string | null
          name: string
          phone: string | null
          property_size: string | null
          property_type: string | null
          spaces_to_design: string[] | null
          special_requirements: string | null
          status: string | null
          timeline: string
          user_id: string | null
        }
        Insert: {
          budget_range: string
          client_type: string
          color_palette?: string[] | null
          created_at?: string
          design_style?: string[] | null
          email: string
          id?: string
          inspiration_links?: string | null
          name: string
          phone?: string | null
          property_size?: string | null
          property_type?: string | null
          spaces_to_design?: string[] | null
          special_requirements?: string | null
          status?: string | null
          timeline: string
          user_id?: string | null
        }
        Update: {
          budget_range?: string
          client_type?: string
          color_palette?: string[] | null
          created_at?: string
          design_style?: string[] | null
          email?: string
          id?: string
          inspiration_links?: string | null
          name?: string
          phone?: string | null
          property_size?: string | null
          property_type?: string | null
          spaces_to_design?: string[] | null
          special_requirements?: string | null
          status?: string | null
          timeline?: string
          user_id?: string | null
        }
        Relationships: []
      }
      issues: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          owner_id: string | null
          project_id: string
          raised_on: string
          ref: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          owner_id?: string | null
          project_id: string
          raised_on?: string
          ref?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          owner_id?: string | null
          project_id?: string
          raised_on?: string
          ref?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget: number | null
          building: string | null
          closed_at: string | null
          converted_project_id: string | null
          created_at: string
          created_by: string | null
          designer_id: string | null
          drive_url: string | null
          email: string | null
          exp_handover: string | null
          floor_plan: string | null
          handover_status: string | null
          id: string
          is_demo: boolean
          last_contact: string | null
          location: string | null
          lost_reason: string | null
          name: string
          next_follow: string | null
          notes: string | null
          phone: string | null
          property: string | null
          ref: string
          refs: string | null
          sales_id: string | null
          scope: string | null
          size: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          style: string | null
          target_date: string | null
          unit_type: string | null
          updated_at: string
          use_type: string | null
        }
        Insert: {
          budget?: number | null
          building?: string | null
          closed_at?: string | null
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          drive_url?: string | null
          email?: string | null
          exp_handover?: string | null
          floor_plan?: string | null
          handover_status?: string | null
          id?: string
          is_demo?: boolean
          last_contact?: string | null
          location?: string | null
          lost_reason?: string | null
          name: string
          next_follow?: string | null
          notes?: string | null
          phone?: string | null
          property?: string | null
          ref?: string
          refs?: string | null
          sales_id?: string | null
          scope?: string | null
          size?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          style?: string | null
          target_date?: string | null
          unit_type?: string | null
          updated_at?: string
          use_type?: string | null
        }
        Update: {
          budget?: number | null
          building?: string | null
          closed_at?: string | null
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          drive_url?: string | null
          email?: string | null
          exp_handover?: string | null
          floor_plan?: string | null
          handover_status?: string | null
          id?: string
          is_demo?: boolean
          last_contact?: string | null
          location?: string | null
          lost_reason?: string | null
          name?: string
          next_follow?: string | null
          notes?: string | null
          phone?: string | null
          property?: string | null
          ref?: string
          refs?: string | null
          sales_id?: string | null
          scope?: string | null
          size?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          style?: string | null
          target_date?: string | null
          unit_type?: string | null
          updated_at?: string
          use_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          emailed_at: string | null
          id: string
          kind: string
          lead_id: string | null
          project_id: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind: string
          lead_id?: string | null
          project_id?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emailed_at?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          project_id?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_costs_private: {
        Row: {
          act_ops: number | null
          act_proc: number | null
          est_ops: number | null
          est_proc: number | null
          project_id: string
          updated_at: string
        }
        Insert: {
          act_ops?: number | null
          act_proc?: number | null
          est_ops?: number | null
          est_proc?: number | null
          project_id: string
          updated_at?: string
        }
        Update: {
          act_ops?: number | null
          act_proc?: number | null
          est_ops?: number | null
          est_proc?: number | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_costs_private_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_files: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          id: string
          project_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          id?: string
          project_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          id?: string
          project_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      projects: {
        Row: {
          act_ops: number | null
          act_proc: number | null
          actual_handover: string | null
          client: string | null
          code: string
          coordinator_id: string | null
          created_at: string
          created_by: string | null
          designer_id: string | null
          drive_url: string | null
          est_ops: number | null
          est_proc: number | null
          handover_date: string | null
          id: string
          is_demo: boolean
          lead_id: string | null
          location: string | null
          name: string
          next_due: string | null
          next_due_date: string | null
          notes: string | null
          overall_pct: number
          pay_status: Database["public"]["Enums"]["pay_status"]
          proc_pct: number
          property: string | null
          received: number | null
          risk: Database["public"]["Enums"]["risk_level"]
          sales_id: string | null
          stage: Database["public"]["Enums"]["project_stage"]
          start_date: string | null
          unit: string | null
          unit_type: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          act_ops?: number | null
          act_proc?: number | null
          actual_handover?: string | null
          client?: string | null
          code?: string
          coordinator_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          drive_url?: string | null
          est_ops?: number | null
          est_proc?: number | null
          handover_date?: string | null
          id?: string
          is_demo?: boolean
          lead_id?: string | null
          location?: string | null
          name: string
          next_due?: string | null
          next_due_date?: string | null
          notes?: string | null
          overall_pct?: number
          pay_status?: Database["public"]["Enums"]["pay_status"]
          proc_pct?: number
          property?: string | null
          received?: number | null
          risk?: Database["public"]["Enums"]["risk_level"]
          sales_id?: string | null
          stage?: Database["public"]["Enums"]["project_stage"]
          start_date?: string | null
          unit?: string | null
          unit_type?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          act_ops?: number | null
          act_proc?: number | null
          actual_handover?: string | null
          client?: string | null
          code?: string
          coordinator_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          drive_url?: string | null
          est_ops?: number | null
          est_proc?: number | null
          handover_date?: string | null
          id?: string
          is_demo?: boolean
          lead_id?: string | null
          location?: string | null
          name?: string
          next_due?: string | null
          next_due_date?: string | null
          notes?: string | null
          overall_pct?: number
          pay_status?: Database["public"]["Enums"]["pay_status"]
          proc_pct?: number
          property?: string | null
          received?: number | null
          risk?: Database["public"]["Enums"]["risk_level"]
          sales_id?: string | null
          stage?: Database["public"]["Enums"]["project_stage"]
          start_date?: string | null
          unit?: string | null
          unit_type?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "projects_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
        ]
      }
      proposals: {
        Row: {
          accepted_option: Json | null
          created_at: string
          created_by: string | null
          currency: string
          decided_at: string | null
          design_id: string | null
          discount: number | null
          id: string
          lead_id: string
          line_items: Json
          sent_at: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          subtotal: number | null
          terms: string | null
          total: number | null
          updated_at: string
          valid_until: string | null
          version: number
        }
        Insert: {
          accepted_option?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          decided_at?: string | null
          design_id?: string | null
          discount?: number | null
          id?: string
          lead_id: string
          line_items?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Update: {
          accepted_option?: Json | null
          created_at?: string
          created_by?: string | null
          currency?: string
          decided_at?: string | null
          design_id?: string | null
          discount?: number | null
          id?: string
          lead_id?: string
          line_items?: Json
          sent_at?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtotal?: number | null
          terms?: string | null
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_briefs: {
        Row: {
          access_notes: string | null
          approved_at: string | null
          assigned_at: string | null
          attachments: Json
          avoid: string | null
          bedrooms: Json
          budget_notes: string | null
          colour_notes: string | null
          colours: Json
          created_at: string
          created_by: string | null
          designer_id: string | null
          extra: Json
          ffe: Json
          header: Json
          id: string
          lead_id: string
          lists: Json
          must_haves: string | null
          ready_at: string | null
          revision_note: string | null
          rooms: Json
          status: Database["public"]["Enums"]["brief_status"]
          style: Json
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          approved_at?: string | null
          assigned_at?: string | null
          attachments?: Json
          avoid?: string | null
          bedrooms?: Json
          budget_notes?: string | null
          colour_notes?: string | null
          colours?: Json
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          extra?: Json
          ffe?: Json
          header?: Json
          id?: string
          lead_id: string
          lists?: Json
          must_haves?: string | null
          ready_at?: string | null
          revision_note?: string | null
          rooms?: Json
          status?: Database["public"]["Enums"]["brief_status"]
          style?: Json
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          approved_at?: string | null
          assigned_at?: string | null
          attachments?: Json
          avoid?: string | null
          bedrooms?: Json
          budget_notes?: string | null
          colour_notes?: string | null
          colours?: Json
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
          extra?: Json
          ffe?: Json
          header?: Json
          id?: string
          lead_id?: string
          lists?: Json
          must_haves?: string | null
          ready_at?: string | null
          revision_note?: string | null
          rooms?: Json
          status?: Database["public"]["Enums"]["brief_status"]
          style?: Json
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_briefs_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "requirement_briefs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      snags: {
        Row: {
          area: string
          created_at: string
          description: string
          fixed_on: string | null
          id: string
          owner_id: string | null
          photo_path: string | null
          project_id: string
          ref: string | null
          ref_seq: number | null
          status: Database["public"]["Enums"]["snag_status"]
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          description: string
          fixed_on?: string | null
          id?: string
          owner_id?: string | null
          photo_path?: string | null
          project_id: string
          ref?: string | null
          ref_seq?: number | null
          status?: Database["public"]["Enums"]["snag_status"]
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string
          fixed_on?: string | null
          id?: string
          owner_id?: string | null
          photo_path?: string | null
          project_id?: string
          ref?: string | null
          ref_seq?: number | null
          status?: Database["public"]["Enums"]["snag_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "snags_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "snags_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: string
          lead_time: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          status: Database["public"]["Enums"]["supplier_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          status?: Database["public"]["Enums"]["supplier_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          done: boolean
          done_at: string | null
          drawing_kind: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          done?: boolean
          done_at?: string | null
          drawing_kind?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          done?: boolean
          done_at?: string | null
          drawing_kind?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          created_at: string
          email: string
          full_name: string
          invited_by: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          title: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["workspace_role"]
          title?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["workspace_role"]
          title?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          is_demo: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          title: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          is_demo?: boolean
          role: Database["public"]["Enums"]["workspace_role"]
          title?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          is_demo?: boolean
          role?: Database["public"]["Enums"]["workspace_role"]
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_see_costing_private: {
        Args: { _costing: string; _uid: string }
        Returns: boolean
      }
      can_see_costs: {
        Args: { _project: string; _uid: string }
        Returns: boolean
      }
      can_see_costs_item: {
        Args: { _item: string; _uid: string }
        Returns: boolean
      }
      can_see_ffe: {
        Args: { _lead: string; _project: string; _uid: string }
        Returns: boolean
      }
      can_see_lead: { Args: { _lead: string; _uid: string }; Returns: boolean }
      can_see_project: {
        Args: { _project: string; _uid: string }
        Returns: boolean
      }
      can_see_project_costs: {
        Args: { _project: string; _uid: string }
        Returns: boolean
      }
      can_touch_workspace_object: {
        Args: { _name: string; _uid: string }
        Returns: boolean
      }
      is_gm: { Args: { _uid: string }; Returns: boolean }
      is_ws_member: { Args: { _uid: string }; Returns: boolean }
      ws_assign_brief: {
        Args: { _brief: string; _designer: string }
        Returns: undefined
      }
      ws_brief_queue: {
        Args: never
        Returns: {
          brief_id: string
          budget: number
          lead_id: string
          name: string
          property: string
          status: Database["public"]["Enums"]["brief_status"]
          submitted_at: string
          target_date: string
          unit_type: string
        }[]
      }
      ws_ffe_band: {
        Args: { _category: string; _item: string; _room: string }
        Returns: number
      }
      ws_ffe_edit_notify_lead: { Args: { _lead: string }; Returns: undefined }
      ws_notify_once: {
        Args: { _kind: string; _lead: string; _title: string; _user: string }
        Returns: undefined
      }
      ws_notify_overdue_drawings: { Args: never; Returns: undefined }
      ws_role: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
      ws_sign_contract: {
        Args: { _contract: string; _handover: string }
        Returns: string
      }
      ws_submit_design_package: {
        Args: { _design: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      brief_status:
        | "Draft"
        | "Submitted"
        | "Assigned"
        | "In Design"
        | "Design Ready"
        | "Design Approved"
        | "Revision Requested"
      contract_status: "Draft" | "Issued" | "Signed"
      costing_status: "Draft" | "Submitted" | "Returned" | "Quoted"
      cr_status: "Pending Approval" | "Approved" | "Rejected"
      design_status: "Draft" | "Submitted" | "Accepted" | "Rejected"
      issue_severity: "Low" | "Medium" | "High"
      issue_status: "Open" | "Escalated" | "Resolved"
      lead_status:
        | "New Lead"
        | "Contacted"
        | "Qualified"
        | "Proposal Sent"
        | "Won"
        | "Lost"
      pay_status: "Not Due" | "Pending" | "Partially Paid" | "Paid" | "Overdue"
      proc_stage:
        | "Awaiting Quote"
        | "Quote Received"
        | "Negotiation"
        | "Awaiting Approval"
        | "Payment Required"
        | "Ordered"
        | "Supplier Confirmed"
        | "In Production"
        | "Ready for Delivery"
        | "Delivery Scheduled"
        | "Delivered"
        | "Installation Pending"
        | "Installed"
        | "Issue / Replacement"
        | "Closed"
      project_stage:
        | "Contract / Deposit"
        | "Site Survey"
        | "Design"
        | "Client Approval"
        | "Procurement"
        | "Production"
        | "Installation"
        | "Snagging"
        | "Handover"
        | "Closed"
      proposal_status: "Draft" | "Sent" | "Accepted" | "Rejected"
      risk_level: "Green" | "Yellow" | "Red"
      snag_status: "Open" | "Fixed" | "Verified"
      supplier_status: "Preferred" | "Approved" | "On Watch" | "Blocked"
      task_priority: "Low" | "Medium" | "High"
      workspace_role: "gm" | "sales" | "designer" | "coordinator"
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
      app_role: ["admin", "user"],
      brief_status: [
        "Draft",
        "Submitted",
        "Assigned",
        "In Design",
        "Design Ready",
        "Design Approved",
        "Revision Requested",
      ],
      contract_status: ["Draft", "Issued", "Signed"],
      costing_status: ["Draft", "Submitted", "Returned", "Quoted"],
      cr_status: ["Pending Approval", "Approved", "Rejected"],
      design_status: ["Draft", "Submitted", "Accepted", "Rejected"],
      issue_severity: ["Low", "Medium", "High"],
      issue_status: ["Open", "Escalated", "Resolved"],
      lead_status: [
        "New Lead",
        "Contacted",
        "Qualified",
        "Proposal Sent",
        "Won",
        "Lost",
      ],
      pay_status: ["Not Due", "Pending", "Partially Paid", "Paid", "Overdue"],
      proc_stage: [
        "Awaiting Quote",
        "Quote Received",
        "Negotiation",
        "Awaiting Approval",
        "Payment Required",
        "Ordered",
        "Supplier Confirmed",
        "In Production",
        "Ready for Delivery",
        "Delivery Scheduled",
        "Delivered",
        "Installation Pending",
        "Installed",
        "Issue / Replacement",
        "Closed",
      ],
      project_stage: [
        "Contract / Deposit",
        "Site Survey",
        "Design",
        "Client Approval",
        "Procurement",
        "Production",
        "Installation",
        "Snagging",
        "Handover",
        "Closed",
      ],
      proposal_status: ["Draft", "Sent", "Accepted", "Rejected"],
      risk_level: ["Green", "Yellow", "Red"],
      snag_status: ["Open", "Fixed", "Verified"],
      supplier_status: ["Preferred", "Approved", "On Watch", "Blocked"],
      task_priority: ["Low", "Medium", "High"],
      workspace_role: ["gm", "sales", "designer", "coordinator"],
    },
  },
} as const
