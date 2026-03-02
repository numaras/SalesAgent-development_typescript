/**
 * Unit tests for taskDetailService.
 *
 * DB is mocked. Tests: found returns task detail; not-found throws TaskNotFoundError.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock("../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    limit: (...args: unknown[]) => mockLimit(...args),
  },
}));

import {
  getTaskDetail,
  TaskNotFoundError,
} from "./taskDetailService.js";

const ctx = {};

function makeStepRow(overrides: Record<string, unknown> = {}) {
  return {
    stepId: "step_1",
    contextId: "ctx_1",
    stepType: "approval",
    toolName: "create_media_buy",
    requestData: { operation: "create" },
    responseData: null,
    status: "pending",
    owner: "principal",
    assignedTo: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    completedAt: null,
    errorMessage: null,
    transactionDetails: null,
    comments: [],
    ...overrides,
  };
}

describe("getTaskDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns task detail when task exists", async () => {
    const stepsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([makeStepRow({ stepId: "task_1" })]),
        }),
      }),
    };
    const mappingsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            objectType: "media_buy",
            objectId: "mb_1",
            action: "create",
            createdAt: new Date("2026-01-15T09:00:00Z"),
          },
        ]),
      }),
    };
    let callIndex = 0;
    mockSelect.mockImplementation(() => {
      callIndex += 1;
      return callIndex === 1 ? stepsChain : mappingsChain;
    });

    const result = await getTaskDetail(ctx, "task_1");

    expect(result.task_id).toBe("task_1");
    expect(result.status).toBe("pending");
    expect(result.type).toBe("approval");
    expect(result.associated_objects).toHaveLength(1);
    expect(result.associated_objects[0]).toMatchObject({
      type: "media_buy",
      id: "mb_1",
      action: "create",
    });
    expect(result.request_data).toEqual({ operation: "create" });
  });

  it("throws TaskNotFoundError when task does not exist", async () => {
    const stepsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    mockSelect.mockReturnValue(stepsChain);

    await expect(getTaskDetail(ctx, "nonexistent")).rejects.toThrow(
      TaskNotFoundError,
    );
    await expect(getTaskDetail(ctx, "nonexistent")).rejects.toThrow(
      "Task nonexistent not found",
    );
  });
});
