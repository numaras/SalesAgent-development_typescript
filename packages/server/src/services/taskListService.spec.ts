/**
 * Unit tests for taskListService.
 *
 * DB is mocked. Tests: filter by status; pagination offset.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

vi.mock("../db/client.js", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    where: (...args: unknown[]) => mockWhere(...args),
    orderBy: (...args: unknown[]) => mockOrderBy(...args),
    limit: (...args: unknown[]) => mockLimit(...args),
    offset: (...args: unknown[]) => mockOffset(...args),
  },
}));

import { listTasks } from "./taskListService.js";

const ctx = {};

function makeStepRow(overrides: Record<string, unknown> = {}) {
  return {
    stepId: "step_1",
    contextId: "ctx_1",
    stepType: "approval",
    toolName: "create_media_buy",
    requestData: null,
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

describe("listTasks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    });
  });

  it("filters by status and returns matching task", async () => {
    const countChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 1 }]),
      }),
    };
    const stepsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([
                makeStepRow({ stepId: "s1", status: "pending" }),
              ]),
            }),
          }),
        }),
      }),
    };
    const mappingsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    };
    let callIndex = 0;
    mockSelect.mockImplementation((...args: unknown[]) => {
      callIndex += 1;
      if (callIndex === 1) return countChain;
      if (callIndex === 2) return stepsChain;
      return mappingsChain;
    });

    const result = await listTasks(ctx, {
      status: "pending",
      limit: 20,
      offset: 0,
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].status).toBe("pending");
    expect(result.tasks[0].task_id).toBe("s1");
    expect(result.total).toBe(1);
    expect(result.has_more).toBe(false);
  });

  it("applies pagination offset and limit and sets has_more", async () => {
    const countChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 10 }]),
      }),
    };
    const stepsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([
                makeStepRow({ stepId: "s2" }),
                makeStepRow({ stepId: "s3" }),
              ]),
            }),
          }),
        }),
      }),
    };
    const mappingsChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    };
    let callIndex = 0;
    mockSelect.mockImplementation((...args: unknown[]) => {
      callIndex += 1;
      if (callIndex === 1) return countChain;
      if (callIndex === 2) return stepsChain;
      return mappingsChain;
    });

    const result = await listTasks(ctx, {
      limit: 2,
      offset: 1,
    });

    expect(result.tasks).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.offset).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.has_more).toBe(true);
  });

  it("returns empty list when object_type filter matches no mappings", async () => {
    const mappingChain = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    };
    mockSelect.mockReturnValue(mappingChain);

    const result = await listTasks(ctx, {
      object_type: "media_buy",
      object_id: "mb_nonexistent",
    });

    expect(result.tasks).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.has_more).toBe(false);
  });
});
