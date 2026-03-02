/**
 * Unit tests for taskCompleteService.
 *
 * Mocks getTaskDetail and db. Tests: status transition to completed; already completed throws.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./taskDetailService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./taskDetailService.js")>();
  return { ...actual, getTaskDetail: vi.fn() };
});

import {
  getTaskDetail as getTaskDetailFn,
  TaskNotFoundError,
} from "./taskDetailService.js";
const mockGetTaskDetail = vi.mocked(getTaskDetailFn);

const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
vi.mock("../db/client.js", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
    select: vi.fn(),
    from: vi.fn(),
  },
}));

import {
  completeTask,
  TaskAlreadyCompletedError,
} from "./taskCompleteService.js";

const ctx = { principalId: "pr1" };

describe("completeTask", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("marks pending task as completed and returns response", async () => {
    mockGetTaskDetail.mockResolvedValue({
      task_id: "task_1",
      context_id: "ctx_1",
      status: "pending",
      type: "approval",
      tool_name: "create_media_buy",
      owner: "principal",
      created_at: "2026-01-15T10:00:00Z",
      updated_at: null,
      request_data: undefined,
      response_data: undefined,
      error_message: undefined,
      associated_objects: [],
    });

    const result = await completeTask(ctx, {
      task_id: "task_1",
      status: "completed",
    });

    expect(result.task_id).toBe("task_1");
    expect(result.status).toBe("completed");
    expect(result.message).toContain("marked as completed");
    expect(result.completed_at).toBeDefined();
    expect(result.completed_by).toBe("pr1");
  });

  it("throws TaskNotFoundError when task does not exist", async () => {
    mockGetTaskDetail.mockRejectedValue(new TaskNotFoundError("task_missing"));

    await expect(
      completeTask(ctx, { task_id: "task_missing", status: "completed" }),
    ).rejects.toThrow(TaskNotFoundError);
    await expect(
      completeTask(ctx, { task_id: "task_missing", status: "completed" }),
    ).rejects.toThrow("not found");
  });

  it("throws TaskAlreadyCompletedError when task is already completed", async () => {
    mockGetTaskDetail.mockResolvedValue({
      task_id: "task_1",
      context_id: "ctx_1",
      status: "completed",
      type: "approval",
      tool_name: null,
      owner: "principal",
      created_at: "2026-01-15T10:00:00Z",
      updated_at: null,
      request_data: undefined,
      response_data: undefined,
      error_message: undefined,
      associated_objects: [],
    });

    await expect(
      completeTask(ctx, { task_id: "task_1", status: "completed" }),
    ).rejects.toThrow(TaskAlreadyCompletedError);
    await expect(
      completeTask(ctx, { task_id: "task_1", status: "completed" }),
    ).rejects.toThrow("already completed");
  });
});
