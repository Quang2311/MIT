export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    employee_code: string
                    full_name: string | null
                    email: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    employee_code: string
                    full_name?: string | null
                    email?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    employee_code?: string
                    full_name?: string | null
                    email?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            mit_tasks: {
                Row: {
                    id: string
                    user_id: string
                    session_date: string
                    title: string
                    is_completed: boolean
                    completed_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    session_date: string
                    title: string
                    is_completed?: boolean
                    completed_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    session_date?: string
                    title?: string
                    is_completed?: boolean
                    completed_at?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "mit_tasks_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            mit_sessions: {
                Row: {
                    id: string
                    user_id: string
                    session_date: string
                    checkout_at: string
                    total_tasks: number
                    completed_tasks: number
                    completion_rate: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    session_date: string
                    checkout_at?: string
                    total_tasks?: number
                    completed_tasks?: number
                    completion_rate?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    session_date?: string
                    checkout_at?: string
                    total_tasks?: number
                    completed_tasks?: number
                    completion_rate?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "mit_sessions_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
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
