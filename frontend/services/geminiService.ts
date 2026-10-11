import { GoogleGenAI, Type } from '@google/genai';
import { 
  RemiTask, 
  IntentExtractionResult, 
  AlarmVoiceResolution, 
  EscalationCallPayload,
  AssistantActionPayload,
  AssistantDialogueTurn,
  PendingIntentWithoutTime,
  TaskCategory, 
  TaskPriority, 
  TimeAnchor 
} from '../types';
import { 
  createISTDateTime, 
  formatTimeIST, 
  getNowFormattedIST, 
  parseSpokenTimeToIST,
  normalizeToISTDate
} from './timeUtils';

export const TIME_ANCHORS = {
  morning: '08:30 IST',
  afternoon: '13:00 IST',
  evening: '18:00 IST',
  night: '21:00 IST'
};

/**
 * Helper: Finds the best matching task in Eleanor's list when she refers to it conversationally
 */
export function findMatchingTask(userUtterance: string, allTasks: RemiTask[]): RemiTask | null {
  const lower = userUtterance.toLowerCase();

  // 1. Direct keywords
  if (lower.includes('husband') || (lower.includes('call') && (lower.includes('him') || lower.includes('husband')))) {
    const husbandTask = allTasks.find(t => t.heading.toLowerCase().includes('husband'));
    if (husbandTask) return husbandTask;
  }

  if (lower.includes('pill') || lower.includes('blood pressure') || lower.includes('medicine') || lower.includes('medication')) {
    const healthTask = allTasks.find(t => t.category === 'health' || t.heading.toLowerCase().includes('blood') || t.heading.toLowerCase().includes('pill'));
    if (healthTask) return healthTask;
  }

  if (lower.includes('water') || lower.includes('plant') || lower.includes('porch')) {
    const householdTask = allTasks.find(t => t.category === 'household' || t.heading.toLowerCase().includes('plant') || t.heading.toLowerCase().includes('water'));
    if (householdTask) return householdTask;
  }

  if (lower.includes('walk') || lower.includes('garden') || lower.includes('exercise')) {
    const activityTask = allTasks.find(t => t.category === 'activity' || t.heading.toLowerCase().includes('walk'));
    if (activityTask) return activityTask;
  }

  if (lower.includes('priya') || lower.includes('park') || (lower.includes('meet') && !lower.includes('call'))) {
    const socialTask = allTasks.find(t => t.heading.toLowerCase().includes('priya') || t.heading.toLowerCase().includes('park'));
    if (socialTask) return socialTask;
  }

  if (lower.includes('missed') || lower.includes('past') || lower.includes('earlier')) {
    const missedTask = allTasks.find(t => t.status === 'missed');
    if (missedTask) return missedTask;
  }

  for (const task of allTasks) {
    const words = task.heading.toLowerCase().split(' ').filter(w => w.length > 3);
    for (const word of words) {
      if (lower.includes(word)) return task;
    }
  }

  return allTasks.find(t => t.status === 'pending') || allTasks[0] || null;
}

/**
 * Prompt 1: Conversational Intent Parser & Slot-Filling Engine
 */
export async function parseIntentWithSlotFilling(
  utterance: string,
  createdBy: 'patient' | 'caregiver'
): Promise<IntentExtractionResult> {
  const currentTimestamp = new Date().toISOString();
  const currentTimeIST = getNowFormattedIST();

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

    const systemPrompt = `SYSTEM PROMPT: Intent Extractor & Slot Filler

You are the conversational intent parser for Remi, an AI assistant for patients with cognitive decline and their caregivers. Your job is to process raw voice utterances and convert them into structured task objects.

CURRENT SYSTEM TIME: ${currentTimestamp} (${currentTimeIST})
TIMEZONE RULE: All timestamps and trigger times MUST be calculated in Indian Standard Time (IST, UTC+5:30).

PATIENT DEFAULT TIME ANCHORS (IST):
- Morning: 08:30 IST
- Afternoon: 13:00 IST
- Evening: 18:00 IST
- Night: 21:00 IST

CATEGORIZATION & PRIORITY RULES:
1. Health tasks (medications, blood pressure) and Social tasks (calling husband, calling daughter, meeting friends) MUST be assigned priority: "critical" or "high".
2. If Eleanor says "Call my husband", heading MUST be "Call Husband", category: "social", priority: "high".
3. Dynamically generate a clear, 3-to-5 word heading.

SLOT-FILLING & CLARIFICATION RULES:
1. If the input is missing a target execution time (e.g. "I want to call my husband" without a time):
   - Set has_missing_info = true.
   - Set clarification_prompt = "When would you like to call your husband, Eleanor?"
2. If time IS mentioned (e.g., "in 1 minute", "at 4pm", "after lunch", "in 10 seconds"):
   - Set has_missing_info = false.
   - Calculate trigger_time accurately in ISO-8601.

ASSIGNMENT RULES:
- If Eleanor says "Remind my daughter/caregiver to...", set assigned_to = "caregiver".
- Otherwise (including calling husband, taking medication), set assigned_to = "patient".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Utterance: "${utterance}"\nCreated By: ${createdBy}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            heading: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['health', 'social', 'activity', 'household', 'general'] },
            priority: { type: Type.STRING, enum: ['critical', 'high', 'normal'] },
            assigned_to: { type: Type.STRING, enum: ['patient', 'caregiver'] },
            created_by: { type: Type.STRING, enum: ['patient', 'caregiver'] },
            has_missing_info: { type: Type.BOOLEAN },
            clarification_prompt: { type: Type.STRING, nullable: true },
            fallback_time_anchor_used: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening', 'night'], nullable: true },
            trigger_time: { type: Type.STRING, description: 'ISO-8601 string' },
            end_time: { type: Type.STRING, description: 'ISO-8601 string' }
          },
          required: [
            'heading',
            'category',
            'priority',
            'assigned_to',
            'created_by',
            'has_missing_info',
            'trigger_time',
            'end_time'
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());

    // Normalize date with timeUtils parser to ensure relative seconds/minutes match exactly
    const parsedTime = parseSpokenTimeToIST(utterance);
    const normalizedTriggerTime = parsedTime.iso || normalizeToISTDate(parsed.trigger_time, 0);
    const normalizedEndTime = new Date(new Date(normalizedTriggerTime).getTime() + 3600000).toISOString();
    const formattedTriggerIST = formatTimeIST(normalizedTriggerTime);

    const resurfacingPrompt = createdBy === 'caregiver'
      ? `Your daughter Sarah left a gentle reminder for you: please remember to ${parsed.heading.toLowerCase()} at ${formattedTriggerIST}.`
      : `You mentioned earlier that you wanted to ${parsed.heading.toLowerCase()} at ${formattedTriggerIST}.`;

    return {
      heading: parsed.heading,
      category: parsed.category as TaskCategory,
      priority: parsed.priority as TaskPriority,
      assigned_to: parsed.assigned_to,
      created_by: createdBy,
      has_missing_info: parsed.has_missing_info,
      clarification_prompt: parsed.clarification_prompt,
      fallback_time_anchor_used: parsed.fallback_time_anchor_used as TimeAnchor || null,
      trigger_time: normalizedTriggerTime,
      end_time: normalizedEndTime,
      raw_utterance: utterance,
      resurfacingPrompt
    };
  } catch (err) {
    console.warn('Gemini extraction fallback:', err);
    return fallbackIntentParser(utterance, createdBy);
  }
}

function fallbackIntentParser(utterance: string, createdBy: 'patient' | 'caregiver'): IntentExtractionResult {
  const text = utterance.toLowerCase();
  let category: TaskCategory = 'general';
  let priority: TaskPriority = 'normal';
  let heading = 'Gentle Reminder Task';
  let hasMissingTime = true;
  let anchorUsed: TimeAnchor | null = 'afternoon';
  let assigned_to: 'patient' | 'caregiver' = 'patient';

  if (text.includes('husband')) {
    category = 'social';
    priority = 'high';
    heading = 'Call Husband';
  } else if (text.includes('ask sarah') || text.includes('remind sarah') || (text.includes('daughter') && text.includes('call'))) {
    assigned_to = 'caregiver';
    category = 'social';
    priority = 'high';
    heading = 'Sarah Phone Call with Eleanor';
  } else if (text.includes('pill') || text.includes('medicine') || text.includes('blood pressure') || text.includes('doctor')) {
    category = 'health';
    priority = 'critical';
    heading = text.includes('blood pressure') ? 'Blood Pressure Medication' : 'Prescribed Health Medication';
  } else if (text.includes('call') || text.includes('priya') || text.includes('park')) {
    category = 'social';
    priority = 'high';
    heading = text.includes('park') ? 'Meet Priya in Park' : 'Call Family Member';
  } else if (text.includes('walk') || text.includes('exercise')) {
    category = 'activity';
    priority = 'high';
    heading = 'Afternoon Outdoor Walk';
  } else if (text.includes('water') || text.includes('plants')) {
    category = 'household';
    priority = 'normal';
    heading = 'Water Porch Plants';
  }

  const parsedTime = parseSpokenTimeToIST(utterance);
  const hasSpecificTime = text.includes('at') || text.includes('pm') || text.includes('am') || text.includes('after') || text.includes('tomorrow') || text.includes('in ') || text.includes('now');
  hasMissingTime = !hasSpecificTime;

  const triggerISO = parsedTime.iso;
  const endISO = new Date(new Date(triggerISO).getTime() + 60 * 60 * 1000).toISOString();
  const formattedIST = parsedTime.formattedIST;

  return {
    heading,
    category,
    priority,
    assigned_to,
    created_by: createdBy,
    has_missing_info: hasMissingTime,
    clarification_prompt: hasMissingTime ? `When would you like to ${heading.toLowerCase()}, Eleanor?` : null,
    fallback_time_anchor_used: hasMissingTime ? anchorUsed : null,
    trigger_time: triggerISO,
    end_time: endISO,
    raw_utterance: utterance,
    resurfacingPrompt: assigned_to === 'caregiver'
      ? `Sarah was requested to call you at ${formattedIST}.`
      : createdBy === 'caregiver'
        ? `Your daughter left a note: ${heading} at ${formattedIST}.`
        : `You mentioned wanting to ${heading.toLowerCase()} at ${formattedIST}.`
  };
}

/**
 * CONVERSATIONAL AI ASSISTANT:
 * Full Conversational Slot-Filling, Day Snapshot, Past Task Editing, and Future Scheduling.
 */
export async function converseWithRemiAssistant(
  userUtterance: string,
  history: AssistantDialogueTurn[],
  allTasks: RemiTask[],
  pendingIntent: PendingIntentWithoutTime | null = null,
  patientName: string = 'Eleanor',
  caregiverName: string = 'Sarah'
): Promise<AssistantActionPayload> {
  const currentTimeIST = getNowFormattedIST();
  const lower = userUtterance.toLowerCase();

  // PRE-CHECK: Direct command to change / move / reschedule an existing task
  const isRescheduleCommand = 
    lower.includes('change') || 
    lower.includes('move') || 
    lower.includes('reschedule') || 
    lower.includes('push') || 
    lower.includes('delay') ||
    lower.includes('postpone') ||
    (lower.includes('husband') && (lower.includes('at') || lower.includes('to'))) ||
    (lower.includes('pill') && (lower.includes('at') || lower.includes('to'))) ||
    (lower.includes('walk') && (lower.includes('at') || lower.includes('to'))) ||
    (lower.includes('plant') && (lower.includes('at') || lower.includes('to')));

  const isMissedEditCommand = 
    lower.includes('missed') || 
    (lower.includes('past') && (lower.includes('move') || lower.includes('change') || lower.includes('done')));

  if (isRescheduleCommand || isMissedEditCommand) {
    const matched = findMatchingTask(userUtterance, allTasks);
    if (matched) {
      const parsedTime = parseSpokenTimeToIST(userUtterance);
      const isPastMissed = matched.status === 'missed' || isMissedEditCommand;
      const targetTimeFormatted = parsedTime.formattedIST;

      return {
        actionType: isPastMissed ? 'edit_past_task' : 'reschedule_task',
        editedTaskId: matched.task_id,
        rescheduledTaskId: matched.task_id,
        newStatus: 'pending',
        newTimeISO: parsedTime.iso,
        newTimeFormatted: targetTimeFormatted,
        spokenResponse: `Of course, ${patientName}. I've updated your reminder for ${matched.heading.toLowerCase()} to ${targetTimeFormatted}. The alarm will ring on time, and I sent an alert to ${caregiverName}'s phone so she knows as well.`,
        caregiverDispatch: {
          title: `${patientName} updated her schedule`,
          body: `${patientName} moved "${matched.heading}" to ${targetTimeFormatted}. Remi updated her Today View.`,
          timeFormatted: targetTimeFormatted,
          requestedTime: targetTimeFormatted
        }
      };
    }
  }

  // Pre-check for "Call husband" with specific time
  if (lower.includes('husband') && (lower.includes('at') || lower.includes('in ') || lower.includes('after') || lower.includes('pm') || lower.includes('am'))) {
    const parsed = parseSpokenTimeToIST(userUtterance);
    const endISO = new Date(new Date(parsed.iso).getTime() + 3600000).toISOString();
    return {
      actionType: 'create_task',
      spokenResponse: `I have set a reminder for you to call your husband at ${parsed.formattedIST}. The alarm will ring when it is time!`,
      newTask: {
        heading: 'Call Husband',
        category: 'social',
        priority: 'high',
        assigned_to: 'patient',
        trigger_time: parsed.iso,
        end_time: endISO,
        raw_utterance: userUtterance,
        resurfacingPrompt: `You mentioned wanting to call your husband at ${parsed.formattedIST}.`
      }
    };
  }

  const scheduleOverview = allTasks.map(t => {
    const timeStr = formatTimeIST(t.trigger_time, true);
    return `[ID: ${t.task_id}] "${t.heading}" - Status: ${t.status}, Time: ${timeStr}, Priority: ${t.priority}, Category: ${t.category}`;
  }).join('\n') || 'No tasks on record.';

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

    const systemPrompt = `You are "Remi", a sweet, warm, deeply compassionate personal voice assistant for ${patientName}, an older adult with age-related memory decline. Her daughter and devoted caregiver is ${caregiverName}.
Current local time (IST): ${currentTimeIST}.

CURRENT TASKS ON RECORD:
${scheduleOverview}

PENDING INTENT FROM PREVIOUS TURN AWAITING TIME:
${pendingIntent ? JSON.stringify(pendingIntent) : 'None'}

RULES:
1. MISSING TIME: If ${patientName} says she wants to do something WITHOUT mentioning a time (e.g. "I want to call my husband", "I need to take my blood pressure pills"):
   - Set actionType = "ask_time_clarification".
   - Ask sweetly: "When would you like to call your husband, Eleanor? Maybe in a few minutes, or this afternoon?"
   - Populate "pendingIntentWithoutTime".

2. AWAITING TIME CONFIRMATION: If there is a pendingIntent and ${patientName} provides a time (e.g. "at 4 PM", "in 1 minute", "in 10 seconds", "after tea"):
   - Combine pending intent with the time.
   - Set actionType = "create_task".
   - Set assigned_to = "patient".
   - Populate "newTask". Confirm that an alarm is set for that time.

3. RESCHEDULING OR EDITING:
   - Identify task, update trigger_time, notify caregiver.

4. TONE: Sweet, caring, reassuring, human-like voice. Always state times in IST clearly.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Eleanor says: "${userUtterance}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionType: { 
              type: Type.STRING, 
              enum: [
                'snapshot_day', 
                'create_task', 
                'create_future_task', 
                'edit_past_task', 
                'reschedule_task', 
                'ask_time_clarification', 
                'assign_caregiver', 
                'general_conversation'
              ] 
            },
            spokenResponse: { 
              type: Type.STRING, 
              description: 'Warm, natural, sweet spoken response for Eleanor with IST times' 
            },
            pendingIntentWithoutTime: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                heading: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['health', 'social', 'activity', 'household', 'general'] },
                priority: { type: Type.STRING, enum: ['critical', 'high', 'normal'] },
                assigned_to: { type: Type.STRING, enum: ['patient', 'caregiver'] },
                raw_utterance: { type: Type.STRING }
              }
            },
            newTask: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                heading: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['health', 'social', 'activity', 'household', 'general'] },
                priority: { type: Type.STRING, enum: ['critical', 'high', 'normal'] },
                assigned_to: { type: Type.STRING, enum: ['patient', 'caregiver'] },
                trigger_time: { type: Type.STRING },
                end_time: { type: Type.STRING },
                raw_utterance: { type: Type.STRING },
                resurfacingPrompt: { type: Type.STRING }
              }
            },
            editedTaskId: { type: Type.STRING, nullable: true },
            newStatus: { type: Type.STRING, enum: ['pending', 'completed', 'snoozed', 'missed', 'rescheduled'], nullable: true },
            rescheduledTaskId: { type: Type.STRING, nullable: true },
            newTimeISO: { type: Type.STRING, nullable: true },
            newTimeFormatted: { type: Type.STRING, nullable: true },
            caregiverDispatch: {
              type: Type.OBJECT,
              nullable: true,
              properties: {
                title: { type: Type.STRING },
                body: { type: Type.STRING },
                timeFormatted: { type: Type.STRING },
                requestedTime: { type: Type.STRING }
              }
            }
          },
          required: ['actionType', 'spokenResponse']
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());

    if (parsed.newTask) {
      // Use timeUtils deterministic parser if natural time was in utterance
      const parsedTime = parseSpokenTimeToIST(userUtterance);
      parsed.newTask.trigger_time = parsedTime.iso;
      parsed.newTask.end_time = new Date(new Date(parsedTime.iso).getTime() + 3600000).toISOString();
      if (!parsed.newTask.assigned_to) {
        parsed.newTask.assigned_to = 'patient';
      }
    }

    if (parsed.actionType === 'reschedule_task' || parsed.actionType === 'edit_past_task') {
      const matched = findMatchingTask(userUtterance, allTasks);
      if (matched) {
        parsed.rescheduledTaskId = parsed.rescheduledTaskId || matched.task_id;
        parsed.editedTaskId = parsed.editedTaskId || matched.task_id;
        const resolved = parseSpokenTimeToIST(userUtterance);
        parsed.newTimeISO = resolved.iso;
        parsed.newTimeFormatted = resolved.formattedIST;
      }
    }

    return parsed as AssistantActionPayload;
  } catch (error) {
    console.warn('Conversational AI fallback:', error);
    return fallbackConversationalAssistant(userUtterance, allTasks, pendingIntent, patientName, caregiverName);
  }
}

function fallbackConversationalAssistant(
  userUtterance: string,
  allTasks: RemiTask[],
  pendingIntent: PendingIntentWithoutTime | null,
  patientName: string,
  caregiverName: string
): AssistantActionPayload {
  const lower = userUtterance.toLowerCase();

  // 1. Pending intent resolution
  if (pendingIntent) {
    const parsed = parseSpokenTimeToIST(userUtterance);
    const endISO = new Date(new Date(parsed.iso).getTime() + 3600000).toISOString();

    return {
      actionType: lower.includes('tomorrow') ? 'create_future_task' : 'create_task',
      spokenResponse: `Perfect, ${patientName}! I have scheduled "${pendingIntent.heading}" for ${parsed.formattedIST}. The alarm will ring when it is time.`,
      newTask: {
        heading: pendingIntent.heading,
        category: pendingIntent.category,
        priority: pendingIntent.priority,
        assigned_to: 'patient',
        trigger_time: parsed.iso,
        end_time: endISO,
        raw_utterance: `${pendingIntent.raw_utterance} at ${userUtterance}`,
        resurfacingPrompt: `You mentioned wanting to ${pendingIntent.heading.toLowerCase()} at ${parsed.formattedIST}.`
      },
      pendingIntentWithoutTime: null
    };
  }

  // 2. User states intent WITHOUT specifying time -> Prompt for time in IST
  const hasIntentPhrase = lower.includes('i want to') || lower.includes('i need to') || lower.includes('i should') || lower.includes('i will') || lower.includes('take my') || lower.includes('water') || lower.includes('call my');
  const hasTimeIndicator = lower.includes('at') || lower.includes('pm') || lower.includes('am') || lower.includes('after') || lower.includes('tomorrow') || lower.includes('morning') || lower.includes('evening') || lower.includes('o\'clock') || lower.includes('ist') || lower.includes('in ') || lower.includes('now');

  if (hasIntentPhrase && !hasTimeIndicator) {
    let heading = "Personal Intention";
    let category: TaskCategory = "general";
    let priority: TaskPriority = "normal";

    if (lower.includes('husband')) {
      heading = "Call Husband";
      category = "social";
      priority = "high";
    } else if (lower.includes('pill') || lower.includes('medicine') || lower.includes('blood pressure')) {
      heading = "Blood Pressure Medication";
      category = "health";
      priority = "critical";
    } else if (lower.includes('water') || lower.includes('plant')) {
      heading = "Water Front Porch Plants";
      category = "household";
      priority = "normal";
    } else if (lower.includes('walk') || lower.includes('exercise')) {
      heading = "Garden Walk";
      category = "activity";
      priority = "high";
    } else if (lower.includes('call') || lower.includes('daughter') || lower.includes('priya')) {
      heading = "Call Family Member";
      category = "social";
      priority = "high";
    }

    return {
      actionType: 'ask_time_clarification',
      spokenResponse: `When would you like to ${heading.toLowerCase()}, ${patientName}? You can say in a few minutes, or at an exact time today.`,
      pendingIntentWithoutTime: {
        heading,
        category,
        priority,
        assigned_to: 'patient',
        raw_utterance: userUtterance
      }
    };
  }

  // 3. Edit past or missed tasks in IST
  if (lower.includes('missed') || lower.includes('yesterday') || (lower.includes('earlier') && (lower.includes('move') || lower.includes('did')))) {
    const missedTask = allTasks.find(t => t.status === 'missed') || allTasks[0];
    const parsed = parseSpokenTimeToIST(userUtterance);

    return {
      actionType: 'edit_past_task',
      editedTaskId: missedTask?.task_id,
      rescheduledTaskId: missedTask?.task_id,
      newStatus: 'pending',
      newTimeISO: parsed.iso,
      newTimeFormatted: parsed.formattedIST,
      spokenResponse: `I've updated your missed task "${missedTask?.heading}". It is now rescheduled for ${parsed.formattedIST} on your Today View, and the alarm will ring on time.`,
      caregiverDispatch: {
        title: `${patientName} rescheduled past task`,
        body: `${patientName} moved missed task "${missedTask?.heading}" to ${parsed.formattedIST}.`,
        timeFormatted: parsed.formattedIST,
        requestedTime: parsed.formattedIST
      }
    };
  }

  // 4. Create future tasks in IST
  if (lower.includes('tomorrow') || lower.includes('next week') || lower.includes('next tuesday')) {
    const parsed = parseSpokenTimeToIST(userUtterance);
    const endISO = new Date(new Date(parsed.iso).getTime() + 3600000).toISOString();
    const title = lower.includes('doctor') ? 'Doctor Visit Appointment' : 'Scheduled Future Reminder';

    return {
      actionType: 'create_future_task',
      spokenResponse: `I have scheduled your ${title.toLowerCase()} for ${parsed.formattedIST}. I have also notified ${caregiverName} on her phone calendar.`,
      newTask: {
        heading: title,
        category: lower.includes('doctor') ? 'health' : 'general',
        priority: lower.includes('doctor') ? 'critical' : 'normal',
        assigned_to: 'patient',
        trigger_time: parsed.iso,
        end_time: endISO,
        raw_utterance: userUtterance,
        resurfacingPrompt: `Tomorrow reminder: ${title} at ${parsed.formattedIST}.`
      },
      caregiverDispatch: {
        title: `Future task scheduled by ${patientName}`,
        body: `${patientName} scheduled "${title}" for ${parsed.formattedIST}.`,
        timeFormatted: parsed.formattedIST,
        requestedTime: parsed.formattedIST
      }
    };
  }

  // 5. Changing time of today's task in IST
  if (lower.includes('change') || lower.includes('move') || lower.includes('push') || (lower.includes('pills') && lower.includes('at'))) {
    const matching = findMatchingTask(userUtterance, allTasks);
    const parsed = parseSpokenTimeToIST(userUtterance);
    const taskTitle = matching?.heading || "your reminder";

    return {
      actionType: 'reschedule_task',
      rescheduledTaskId: matching?.task_id || allTasks[0]?.task_id,
      editedTaskId: matching?.task_id || allTasks[0]?.task_id,
      newTimeISO: parsed.iso,
      newTimeFormatted: parsed.formattedIST,
      spokenResponse: `Of course, ${patientName}. I have moved your ${taskTitle.toLowerCase()} to ${parsed.formattedIST}. It is on your schedule for today, and the alarm will sound when it's time.`,
      caregiverDispatch: {
        title: `${patientName} updated her schedule`,
        body: `${patientName} moved "${taskTitle}" to ${parsed.formattedIST}. Remi updated her Today View.`,
        timeFormatted: parsed.formattedIST,
        requestedTime: parsed.formattedIST
      }
    };
  }

  // 6. Day Snapshot in IST
  if (lower.includes('today') || lower.includes('schedule') || lower.includes('snapshot') || lower.includes('what do i have')) {
    const pendingList = allTasks.filter(t => t.status !== 'completed');
    let summary = `Good day, ${patientName}! You have ${pendingList.length} reminders scheduled for today in Indian Standard Time.`;
    if (pendingList.length > 0) {
      const topItems = pendingList.slice(0, 2).map(t => {
        const time = formatTimeIST(t.trigger_time);
        return `${t.heading} at ${time}`;
      }).join(', and ');
      summary += ` Coming up first is ${topItems}. You are doing wonderfully!`;
    } else {
      summary += ` You are completely caught up right now with all your tasks.`;
    }

    return {
      actionType: 'snapshot_day',
      spokenResponse: summary
    };
  }

  // 7. General fallback
  return {
    actionType: 'general_conversation',
    spokenResponse: `I'm right here with you, ${patientName}. You can tell me something you'd like to do, ask to set an alarm to call your husband, or check your schedule today.`
  };
}

/**
 * Prompt 2: Real-time Voice Resolution & Alarm Handler
 */
export async function resolveAlarmVoiceResponse(
  task: RemiTask,
  userSpokenResponse: string
): Promise<AlarmVoiceResolution> {
  const currentTimestamp = new Date().toISOString();

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

    const systemPrompt = `SYSTEM PROMPT: Alarm Voice Resolver

You are managing an active alarm for Remi. An alarm is currently ringing for the patient with task details.

CURRENT TASK:
- Heading: "${task.heading}"
- Priority: "${task.priority}"
- Scheduled Trigger Time (IST): "${formatTimeIST(task.trigger_time)}"
- Current Time: "${currentTimestamp}"

USER VOICE RESPONSE: "${userSpokenResponse}"

INSTRUCTIONS:
1. Classify the user's response into one of the following actions:
   - "complete": User indicates they completed the task ("I took it", "Done", "Finished", "I did this", "I called him").
   - "snooze": User wants to delay briefly ("Remind me in 10 minutes", "Not now", "Later").
   - "reschedule": User specifies a new time ("Move this to 5 PM", "Make it 6").
   - "delete": User wants to cancel the task ("Don't need to do this anymore").
   - "unclear": Input cannot be determined.

2. Calculate delay_minutes if completed:
   delay_minutes = (current_timestamp - task_trigger_time) in minutes.

3. Formulate a warm, loving, gentle voice feedback response (max 12 words) optimized for older adults.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userSpokenResponse,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ['complete', 'snooze', 'reschedule', 'delete', 'unclear'] },
            new_trigger_time: { type: Type.STRING, nullable: true },
            delay_minutes: { type: Type.INTEGER, nullable: true },
            voice_response: { type: Type.STRING }
          },
          required: ['action', 'voice_response']
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      action: parsed.action,
      new_trigger_time: parsed.new_trigger_time || null,
      delay_minutes: parsed.delay_minutes ?? computeDelayMinutes(task.trigger_time),
      voice_response: parsed.voice_response
    };
  } catch (err) {
    console.warn('Alarm voice resolution fallback:', err);
    return fallbackAlarmResolver(task, userSpokenResponse);
  }
}

function computeDelayMinutes(triggerTimeISO: string): number {
  const trigger = new Date(triggerTimeISO).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((now - trigger) / 60000);
  return Math.max(0, diffMinutes);
}

function fallbackAlarmResolver(task: RemiTask, spoken: string): AlarmVoiceResolution {
  const lower = spoken.toLowerCase();
  const delay = computeDelayMinutes(task.trigger_time);

  if (lower.includes('done') || lower.includes('took') || lower.includes('did') || lower.includes('called') || lower.includes('finished')) {
    return {
      action: 'complete',
      new_trigger_time: null,
      delay_minutes: delay,
      voice_response: "Wonderful, Eleanor! I have recorded that as done for you."
    };
  }

  if (lower.includes('not now') || lower.includes('later') || lower.includes('minute') || lower.includes('snooze')) {
    const newTime = new Date(Date.now() + 10 * 60000).toISOString();
    return {
      action: 'snooze',
      new_trigger_time: newTime,
      delay_minutes: null,
      voice_response: "No problem at all. I will remind you again in 10 minutes."
    };
  }

  return {
    action: 'complete',
    new_trigger_time: null,
    delay_minutes: delay,
    voice_response: "I've noted that down for you, Eleanor."
  };
}

/**
 * Prompt 3: Emergency Escalation AI Voice Call Generator
 */
export async function generateEscalationCallScript(
  patientName: string,
  caregiverName: string,
  task: RemiTask
): Promise<EscalationCallPayload> {
  const triggerFormattedIST = formatTimeIST(task.trigger_time);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

    const systemPrompt = `SYSTEM PROMPT: Emergency Escalation Call Generator

You are generating an automated AI voice call message dispatched to a caregiver because a critical health/safety task was missed.

INPUT METRICS:
- Patient Name: "${patientName}"
- Caregiver Name: "${caregiverName}"
- Task Heading: "${task.heading}"
- Original Trigger Time: "${triggerFormattedIST}"
- Total Unanswered Alarms: 3 (15 minutes elapsed)

INSTRUCTIONS:
1. Speak clearly, calmly, and directly.
2. State the patient's name, the specific missed task, and how long the alarm has gone unanswered.
3. Provide immediate instruction on what action the caregiver should take.
4. Keep script under 35 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate emergency call message for ${patientName}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            call_script: { type: Type.STRING }
          },
          required: ['call_script']
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      patient_name: patientName,
      caregiver_name: caregiverName,
      task_heading: task.heading,
      task_trigger_time: triggerFormattedIST,
      call_script: parsed.call_script,
      timestamp: Date.now()
    };
  } catch (err) {
    return {
      patient_name: patientName,
      caregiver_name: caregiverName,
      task_heading: task.heading,
      task_trigger_time: triggerFormattedIST,
      call_script: `Hello ${caregiverName}, this is Remi. ${patientName} has not responded to 3 consecutive alarms for '${task.heading}', scheduled for ${triggerFormattedIST}. Please check in on her immediately.`,
      timestamp: Date.now()
    };
  }
}
