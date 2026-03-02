/**
 * Complete a workflow task: set status to completed/failed, response_data, error_message.
 *
 * Legacy equivalent: _legacy/src/core/main.py complete_task()
 *   — find task (tenant-scoped), validate status transition, update WorkflowStep.
 */
import { and, eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { workflowSteps } from "../db/schema/workflowSteps.js";
import type {
  CompleteTaskRequest,
  CompleteTaskResponse,
} from "../schemas/workflowTask.js";
import {
  CompleteTaskRequestSchema,
  CompleteTaskResponseSchema,
} from "../schemas/workflowTask.js";
import {
  getTaskDetail,
  TaskNotFoundError,
} from "./taskDetailService.js";

export interface TaskCompleteContext {
  /** Optional: restrict to steps with this context_id. */
  contextId?: string;
  /** Principal ID (e.g. for completed_by). */
  principalId?: string;
}

const COMPLETABLE_STATUSES = ["pending", "in_progress", "requires_approval"];

export class TaskAlreadyCompletedError extends Error {
  constructor(taskId: string, currentStatus: string) {
    super(`Task ${taskId} is already ${currentStatus} and cannot be completed`);
    this.name = "TaskAlreadyCompletedError";
  }
}

/**
 * Complete a task: validate, update status/completed_at/response_data/error_message, return result.
 */
export async function completeTask(
  ctx: TaskCompleteContext,
  request: CompleteTaskRequest,
): Promise<CompleteTaskResponse> {
  const parsed = CompleteTaskRequestSchema.parse(request);
  const { task_id, status, response_data, error_message } = parsed;

  const trimmed = task_id.trim();
  if (!trimmed) {
    throw new TaskNotFoundError(task_id);
  }

  const existing = await getTaskDetail(
    { contextId: ctx.contextId },
    trimmed,
  );

  if (!COMPLETABLE_STATUSES.includes(existing.status)) {
    throw new TaskAlreadyCompletedError(trimmed, existing.status);
  }

  const completedAt = new Date();
  const updatePayload: Record<string, unknown> = {
    status,
    completedAt,
    ...(status === "completed"
      ? {
          responseData: response_data ?? {
            manually_completed: true,
            completed_by: ctx.principalId ?? "system",
          },
          errorMessage: null,
        }
      : {
          errorMessage: error_message ?? "Task marked as failed manually",
          ...(response_data !== undefined && { responseData: response_data }),
        }),
  };

  const whereClause =
    ctx.contextId
      ? and(
          eq(workflowSteps.stepId, trimmed),
          eq(workflowSteps.contextId, ctx.contextId),
        )
      : eq(workflowSteps.stepId, trimmed);

  await db
    .update(workflowSteps)
    .set(updatePayload as Record<string, unknown>)
    .where(whereClause);

  const response: CompleteTaskResponse = {
    task_id: trimmed,
    status,
    message: `Task ${trimmed} marked as ${status}`,
    completed_at: completedAt.toISOString(),
    completed_by: ctx.principalId,
  };
  return CompleteTaskResponseSchema.parse(response);
}
