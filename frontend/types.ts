export type TaskCategory = 'health' | 'social' | 'activity' | 'household' | 'general';

export type TaskPriority = 'critical' | 'high' | 'normal';

export type TaskStatus = 'pending' | 'completed' | 'snoozed' | 'missed' | 'rescheduled';

export type AssignedTo = 'patient' | 'caregiver';

export type CreatedBy = 'patient' | 'caregiver';

export type TimeAnchor = 'morning' | 'afternoon' | 'evening' | 'night';

export interface RemiTask {
  task_id: string;
  heading: string;
  raw_utterance: string;
  assigned_to: AssignedTo;
  created_by: CreatedBy;
  category: TaskCategory;
  priority: TaskPriority;
  trigger_time: string; // ISO-8601 string
  end_time: string;     // ISO-8601 string
  status: TaskStatus;
  resolution_timestamp: string | null; // ISO-8601 string or null
  delay_minutes: number | null;
  retry_count: number;
  rescheduled_from?: string; // previous ISO time if patient adjusted it
  // Companion helper fields
  resurfacingPrompt?: string;
  fallback_time_anchor_used?: TimeAnchor | null;
  needs_clarification?: boolean;
  clarification_prompt?: string | null;
}

export interface IntentExtractionResult {
  heading: string;
  category: TaskCategory;
  priority: TaskPriority;
  assigned_to: AssignedTo;
  created_by: CreatedBy;
  has_missing_info: boolean;
  clarification_prompt: string | null;
  fallback_time_anchor_used: TimeAnchor | null;
  trigger_time: string;
  end_time: string;
  raw_utterance: string;
  resurfacingPrompt?: string;
}

export interface AlarmVoiceResolution {
  action: 'complete' | 'snooze' | 'reschedule' | 'delete' | 'unclear';
  new_trigger_time: string | null;
  delay_minutes: number | null;
  voice_response: string;
}

export interface EscalationCallPayload {
  patient_name: string;
  caregiver_name: string;
  task_heading: string;
  task_trigger_time: string;
  call_script: string;
  timestamp: number;
}

export interface CategoryDelayInsight {
  category: TaskCategory;
  avgDelayMinutes: number;
  completedCount: number;
  criticalMisses: number;
}

export interface CaregiverPushNotification {
  id: string;
  title: string;
  body: string;
  timeFormatted: string;
  category: TaskCategory;
  priority: TaskPriority;
  source: CreatedBy;
  isSelfStatedSuccess?: boolean;
  isEscalation?: boolean;
  isRescheduledByPatient?: boolean;
}

export interface AssistantDialogueTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface PendingIntentWithoutTime {
  heading: string;
  category: TaskCategory;
  priority: TaskPriority;
  assigned_to: AssignedTo;
  raw_utterance: string;
}

export interface AssistantActionPayload {
  actionType: 
    | 'snapshot_day' 
    | 'create_task' 
    | 'create_future_task' 
    | 'edit_past_task' 
    | 'reschedule_task' 
    | 'ask_time_clarification' 
    | 'assign_caregiver' 
    | 'general_conversation';
  spokenResponse: string;
  pendingIntentWithoutTime?: PendingIntentWithoutTime | null;
  newTask?: {
    heading: string;
    category: TaskCategory;
    priority: TaskPriority;
    assigned_to: AssignedTo;
    trigger_time: string;
    end_time: string;
    raw_utterance: string;
    resurfacingPrompt: string;
  };
  editedTaskId?: string;
  newStatus?: TaskStatus;
  rescheduledTaskId?: string;
  newTimeISO?: string;
  newTimeFormatted?: string;
  caregiverDispatch?: {
    title: string;
    body: string;
    timeFormatted: string;
    requestedTime: string;
  };
}
