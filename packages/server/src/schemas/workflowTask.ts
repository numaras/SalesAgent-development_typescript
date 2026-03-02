/**
 * Zod schemas for list_tasks / get_task (HITL workflow steps).
 *
 * Legacy equivalent: _legacy/src/core/main.py list_tasks() return shape;
 *   _legacy/src/core/database/models.py → class WorkflowStep.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Associated object (object_workflow_mapping row)
// ---------------------------------------------------------------------------

export const AssociatedObjectSchema = z.object({
  type: z.string(),
  id: z.string(),
  action: z.string(),
});
export type AssociatedObject = z.infer<typeof AssociatedObjectSchema>;

// ---------------------------------------------------------------------------
// Task summary (from request_data)
// ---------------------------------------------------------------------------

export const TaskSummarySchema = z.object({
  operation: z.string().optional(),
  media_buy_id: z.string().optional(),
  po_number: z.string().optional(),
});
export type TaskSummary = z.infer<typeof TaskSummarySchema>;

// ---------------------------------------------------------------------------
// Task (formatted workflow step for API response)
// ---------------------------------------------------------------------------

export const TaskSchema = z.object({
  task_id: z.string(),
  status: z.string(),
  type: z.string(),
  tool_name: z.string().nullable(),
  owner: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  context_id: z.string(),
  associated_objects: z.array(AssociatedObjectSchema),
  error_message: z.string().optional(),
  summary: TaskSummarySchema.optional(),
});
export type Task = z.infer<typeof TaskSchema>;

// ---------------------------------------------------------------------------
// ListTasksRequest (filter params + pagination)
// ---------------------------------------------------------------------------

export const ListTasksRequestSchema = z.object({
  status: z.string().optional(),
  object_type: z.string().optional(),
  object_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  context_id: z.string().optional(),
});
export type ListTasksRequest = z.infer<typeof ListTasksRequestSchema>;

// ---------------------------------------------------------------------------
// ListTasksResponse
// ---------------------------------------------------------------------------

export const ListTasksResponseSchema = z.object({
  tasks: z.array(TaskSchema),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  has_more: z.boolean(),
});
export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;

// ---------------------------------------------------------------------------
// GetTaskResponse (get_task detail: includes request_data, response_data)
// ---------------------------------------------------------------------------

export const AssociatedObjectDetailSchema = z.object({
  type: z.string(),
  id: z.string(),
  action: z.string(),
  created_at: z.string(),
});
export type AssociatedObjectDetail = z.infer<typeof AssociatedObjectDetailSchema>;

export const GetTaskResponseSchema = z.object({
  task_id: z.string(),
  context_id: z.string(),
  status: z.string(),
  type: z.string(),
  tool_name: z.string().nullable(),
  owner: z.string(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  request_data: z.record(z.string(), z.unknown()).nullable().optional(),
  response_data: z.record(z.string(), z.unknown()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  associated_objects: z.array(AssociatedObjectDetailSchema),
});
export type GetTaskResponse = z.infer<typeof GetTaskResponseSchema>;

// ---------------------------------------------------------------------------
// CompleteTaskRequest / CompleteTaskResponse (complete_task)
// ---------------------------------------------------------------------------

export const CompleteTaskRequestSchema = z.object({
  task_id: z.string(),
  status: z.enum(["completed", "failed"]),
  response_data: z.record(z.string(), z.unknown()).optional(),
  error_message: z.string().optional(),
});
export type CompleteTaskRequest = z.infer<typeof CompleteTaskRequestSchema>;

export const CompleteTaskResponseSchema = z.object({
  task_id: z.string(),
  status: z.enum(["completed", "failed"]),
  message: z.string(),
  completed_at: z.string(),
  completed_by: z.string().optional(),
});
export type CompleteTaskResponse = z.infer<typeof CompleteTaskResponseSchema>;
