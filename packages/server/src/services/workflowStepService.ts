/**
 * Workflow step service: create WorkflowStep row for media buy (and other) operations.
 *
 * Legacy equivalent: _legacy/src/core/tools/media_buy_create.py
 *   workflow step creation portion — create_workflow_step(context_id, step_type, ...).
 * Contexts table is out of TS scope; contextId can be synthetic (e.g. default_tenant_principal).
 */
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../db/client.js";
import { workflowSteps } from "../db/schema/workflowSteps.js";

export interface CreateWorkflowStepParams {
  contextId: string;
  stepType: string;
  toolName: string;
  requestData: Record<string, unknown>;
  owner?: string;
  status?: string;
}

/**
 * Create a workflow step row and return its step_id.
 * Caller is responsible for providing contextId (e.g. synthetic: default_tenantId_principalId).
 */
export async function createWorkflowStep(
  params: CreateWorkflowStepParams,
): Promise<{ stepId: string }> {
  const stepId = `step_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await db.insert(workflowSteps).values({
    stepId,
    contextId: params.contextId,
    stepType: params.stepType,
    toolName: params.toolName,
    requestData: params.requestData,
    status: params.status ?? "in_progress",
    owner: params.owner ?? "system",
  });
  return { stepId };
}

/**
 * Update status (and optionally error_message) on an existing workflow step.
 * Parity with _legacy ctx_manager.update_workflow_step(step_id, status, error_message).
 */
export async function updateWorkflowStep(
  stepId: string,
  update: { status: string; errorMessage?: string },
): Promise<void> {
  await db
    .update(workflowSteps)
    .set({
      status: update.status,
      ...(update.errorMessage != null && { errorMessage: update.errorMessage }),
    })
    .where(eq(workflowSteps.stepId, stepId));
}
