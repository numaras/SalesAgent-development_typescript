/**
 * Get a single workflow task by task_id (step_id).
 *
 * Legacy equivalent: _legacy/src/core/main.py get_task()
 *   — lookup WorkflowStep by step_id (within tenant via Context join).
 */
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  objectWorkflowMappings,
  workflowSteps,
} from "../db/schema/workflowSteps.js";
import type { GetTaskResponse } from "../schemas/workflowTask.js";
import { GetTaskResponseSchema } from "../schemas/workflowTask.js";

export interface TaskDetailContext {
  /** Optional: restrict to steps with this context_id (e.g. tenant context). */
  contextId?: string;
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task ${taskId} not found`);
    this.name = "TaskNotFoundError";
  }
}

/**
 * Get workflow step (task) by task_id. Throws TaskNotFoundError if not found.
 */
export async function getTaskDetail(
  ctx: TaskDetailContext,
  taskId: string,
): Promise<GetTaskResponse> {
  const trimmed = taskId.trim();
  if (!trimmed) {
    throw new TaskNotFoundError(taskId);
  }

  const whereClause =
    ctx.contextId
      ? and(
          eq(workflowSteps.stepId, trimmed),
          eq(workflowSteps.contextId, ctx.contextId),
        )
      : eq(workflowSteps.stepId, trimmed);

  const rows = await db
    .select()
    .from(workflowSteps)
    .where(whereClause)
    .limit(1);

  const step = rows[0];
  if (!step) {
    throw new TaskNotFoundError(trimmed);
  }

  const mappings = await db
    .select()
    .from(objectWorkflowMappings)
    .where(eq(objectWorkflowMappings.stepId, step.stepId));

  const response: GetTaskResponse = {
    task_id: step.stepId,
    context_id: step.contextId,
    status: step.status,
    type: step.stepType,
    tool_name: step.toolName,
    owner: step.owner,
    created_at:
      step.createdAt instanceof Date
        ? step.createdAt.toISOString()
        : String(step.createdAt),
    updated_at: null,
    request_data: step.requestData ?? undefined,
    response_data: step.responseData ?? undefined,
    error_message: step.errorMessage ?? undefined,
    associated_objects: mappings.map((m) => ({
      type: m.objectType,
      id: m.objectId,
      action: m.action,
      created_at:
        m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : String(m.createdAt),
    })),
  };
  return GetTaskResponseSchema.parse(response);
}
