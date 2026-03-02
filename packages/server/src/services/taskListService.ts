/**
 * List workflow tasks with filters and pagination.
 *
 * Legacy equivalent: _legacy/src/core/main.py list_tasks()
 *   — filter by status, object_type, object_id; paginate with limit/offset.
 */
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/client.js";
import {
  objectWorkflowMappings,
  workflowSteps,
} from "../db/schema/workflowSteps.js";
import type { ListTasksRequest, ListTasksResponse, Task } from "../schemas/workflowTask.js";
import {
  ListTasksRequestSchema,
  ListTasksResponseSchema,
} from "../schemas/workflowTask.js";

export interface TaskListContext {
  /** Optional: filter steps by context_id (e.g. tenant context). */
  contextId?: string;
}

/**
 * List workflow steps (tasks) with optional filters and pagination.
 */
export async function listTasks(
  _ctx: TaskListContext,
  request: ListTasksRequest,
): Promise<ListTasksResponse> {
  const parsed = ListTasksRequestSchema.parse(request);
  const { status, object_type, object_id, limit, offset, context_id } = parsed;

  let stepIdsFilter: string[] | null = null;
  if (object_type ?? object_id) {
    const mappingConditions = [
      object_type ? eq(objectWorkflowMappings.objectType, object_type) : null,
      object_id ? eq(objectWorkflowMappings.objectId, object_id) : null,
    ].filter(Boolean) as ReturnType<typeof eq>[];
    const mappingRows = await db
      .select({ stepId: objectWorkflowMappings.stepId })
      .from(objectWorkflowMappings)
      .where(mappingConditions.length ? and(...mappingConditions) : undefined);
    stepIdsFilter = [...new Set(mappingRows.map((r) => r.stepId))];
    if (stepIdsFilter.length === 0) {
      return ListTasksResponseSchema.parse({
        tasks: [],
        total: 0,
        offset,
        limit,
        has_more: false,
      });
    }
  }

  const stepConditions = [
    context_id ? eq(workflowSteps.contextId, context_id) : null,
    status ? eq(workflowSteps.status, status) : null,
    stepIdsFilter ? inArray(workflowSteps.stepId, stepIdsFilter) : null,
  ].filter(Boolean) as ReturnType<typeof eq | typeof inArray>[];

  const baseWhere = stepConditions.length ? and(...stepConditions) : undefined;

  const countResult = await db
    .select({ value: count() })
    .from(workflowSteps)
    .where(baseWhere);
  const total = Number(countResult[0]?.value ?? 0);

  const rows = await db
    .select()
    .from(workflowSteps)
    .where(baseWhere)
    .orderBy(desc(workflowSteps.createdAt))
    .limit(limit)
    .offset(offset);

  const tasks: Task[] = [];
  for (const step of rows) {
    const mappings = await db
      .select()
      .from(objectWorkflowMappings)
      .where(eq(objectWorkflowMappings.stepId, step.stepId));
    const requestData = step.requestData ?? undefined;
    const summary =
      requestData && typeof requestData === "object" && "operation" in requestData
        ? {
            operation: (requestData as Record<string, unknown>).operation as string | undefined,
            media_buy_id: (requestData as Record<string, unknown>).media_buy_id as string | undefined,
            po_number: (requestData as Record<string, unknown>).request as Record<string, unknown> | undefined
              ? ((requestData as Record<string, unknown>).request as Record<string, unknown>).po_number as string | undefined
              : undefined,
          }
        : undefined;
    const task: Task = {
      task_id: step.stepId,
      status: step.status,
      type: step.stepType,
      tool_name: step.toolName,
      owner: step.owner,
      created_at:
        step.createdAt instanceof Date
          ? step.createdAt.toISOString()
          : String(step.createdAt),
      updated_at: null,
      context_id: step.contextId,
      associated_objects: mappings.map((m) => ({
        type: m.objectType,
        id: m.objectId,
        action: m.action,
      })),
      ...(step.status === "failed" && step.errorMessage
        ? { error_message: step.errorMessage }
        : {}),
      ...(summary ? { summary } : {}),
    };
    tasks.push(task);
  }

  const response: ListTasksResponse = {
    tasks,
    total,
    offset,
    limit,
    has_more: offset + limit < total,
  };
  return ListTasksResponseSchema.parse(response);
}
