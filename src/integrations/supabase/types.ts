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
      design_images: {
        Row: {
          caption: string | null
          created_at: string
          design_id: string
          id: string
          room: string | null
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          design_id: string
          id?: string
          room?: string | null
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          design_id?: string
          id?: string
          room?: string | null
          sort_order?: number
          storage_path?: string
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
          designer_id: string | null
          id: string
          lead_id: string
          notes: string | null
          submitted_at: string | null
          summary: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          designer_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          submitted_at?: string | null
          summary?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          designer_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          submitted_at?: string | null
          summary?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
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
      leads: {
        Row: {
          budget: number | null
          building: string | null
          converted_project_id: string | null
          created_at: string
          created_by: string | null
          designer_id: string | null
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
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
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
          converted_project_id?: string | null
          created_at?: string
          created_by?: string | null
          designer_id?: string | null
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
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          done: boolean
          done_at: string | null
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
      can_see_lead: { Args: { _lead: string; _uid: string }; Returns: boolean }
      can_see_project: {
        Args: { _project: string; _uid: string }
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
      ws_role: {
        Args: { _uid: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
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
      lead_status:
        | "New Lead"
        | "Contacted"
        | "Qualified"
        | "Proposal Sent"
        | "Won"
        | "Lost"
      pay_status: "Not Due" | "Pending" | "Partially Paid" | "Paid" | "Overdue"
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
      lead_status: [
        "New Lead",
        "Contacted",
        "Qualified",
        "Proposal Sent",
        "Won",
        "Lost",
      ],
      pay_status: ["Not Due", "Pending", "Partially Paid", "Paid", "Overdue"],
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
      task_priority: ["Low", "Medium", "High"],
      workspace_role: ["gm", "sales", "designer", "coordinator"],
    },
  },
} as const
