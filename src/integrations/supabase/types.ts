export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// Database enum types
export type UserRole = 'member' | 'manager' | 'executive';
export type DepartmentCode = 'BOD' | 'HR' | 'OPS' | 'MKT' | 'ACC' | 'CX' | 'QAQC' | 'R&D' | 'SP' | 'BD';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    employee_code: string
                    full_name: string | null
                    email: string | null
                    role: UserRole
                    department: DepartmentCode | null
                    created_at: string
                }
                Insert: {
                    id: string
                    employee_code: string
                    full_name?: string | null
                    email?: string | null
                    role?: UserRole
                    department?: DepartmentCode | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    employee_code?: string
                    full_name?: string | null
                    email?: string | null
                    role?: UserRole
                    department?: DepartmentCode | null
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
            tickets: {
                Row: {
                    id: string
                    ticket_code: string | null
                    creator_id: string
                    assignee_id: string | null
                    department_in_charge: DepartmentCode
                    title: string
                    description: string | null
                    status: TicketStatus
                    priority: TicketPriority
                    due_date: string | null
                    resolved_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    ticket_code?: string | null
                    creator_id: string
                    assignee_id?: string | null
                    department_in_charge: DepartmentCode
                    title: string
                    description?: string | null
                    status?: TicketStatus
                    priority?: TicketPriority
                    due_date?: string | null
                    resolved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    ticket_code?: string | null
                    creator_id?: string
                    assignee_id?: string | null
                    department_in_charge?: DepartmentCode
                    title?: string
                    description?: string | null
                    status?: TicketStatus
                    priority?: TicketPriority
                    due_date?: string | null
                    resolved_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "tickets_creator_id_fkey"
                        columns: ["creator_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "tickets_assignee_id_fkey"
                        columns: ["assignee_id"]
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
            user_role: UserRole
            department_code: DepartmentCode
            ticket_status: TicketStatus
            ticket_priority: TicketPriority
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
