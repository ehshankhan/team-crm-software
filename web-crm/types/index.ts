// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  role?: Role;
  project_count?: number;
  project_names?: string[];
  current_leave_start?: string | null;
  current_leave_end?: string | null;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Attendance types
export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string;
  check_out: string | null;
  check_in_latitude: number;
  check_in_longitude: number;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface CheckInRequest {
  latitude: number;
  longitude: number;
}

export interface CheckOutRequest {
  latitude: number;
  longitude: number;
}

// Leave types
export interface Leave {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  approved_by?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface LeaveCreate {
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveUpdate {
  start_date?: string;
  end_date?: string;
  reason?: string;
}

// Timesheet types
export interface Timesheet {
  id: string;
  user_id: string;
  date: string;
  auto_hours: number;
  manual_hours: number;
  total_hours: number;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetUpdate {
  manual_hours?: number;
  notes?: string;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'archived' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
  members: ProjectMember[];
  boards: Board[];
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface Board {
  id: string;
  project_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  estimated_hours: number | null;
  position: number;
  assignee_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  assignee_id?: string;
  position: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  assignee_id?: string;
}

// Inventory types
export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  sku: string | null;
  quantity: number;
  unit: string;
  location: string | null;
  min_threshold: number;
  unit_price: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  transactions: InventoryTransaction[];
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  user_id: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  action: 'stock_in' | 'stock_out';
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string | null;
  created_at: string;
}

export interface StockRequest {
  quantity: number;
  reason?: string;
}
