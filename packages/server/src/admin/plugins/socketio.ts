/**
 * WebSocket plugin: connect / disconnect / subscribe handlers.
 * On subscribe, client sends { event: "subscribe", tenant_id: "..." } and is joined to room tenant_{id}.
 * Parity with _legacy Flask-SocketIO: connect, disconnect, subscribe → join_room(f"tenant_{tenant_id}").
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type { WebSocket } from "ws";

const WS_PATH = "/ws";

/** Room name → set of WebSocket connections */
const rooms = new Map<string, Set<WebSocket>>();
/** Socket → set of room names (for cleanup on disconnect) */
const socketRooms = new WeakMap<WebSocket, Set<string>>();

function ensureSocketRooms(ws: WebSocket): Set<string> {
  let set = socketRooms.get(ws);
  if (!set) {
    set = new Set<string>();
    socketRooms.set(ws, set);
  }
  return set;
}

function joinRoom(ws: WebSocket, roomName: string): void {
  let set = rooms.get(roomName);
  if (!set) {
    set = new Set<WebSocket>();
    rooms.set(roomName, set);
  }
  set.add(ws);
  ensureSocketRooms(ws).add(roomName);
}

function leaveAllRooms(ws: WebSocket): void {
  const names = socketRooms.get(ws);
  if (!names) return;
  for (const roomName of names) {
    const set = rooms.get(roomName);
    if (set) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(roomName);
    }
  }
  names.clear();
}

/**
 * Broadcast payload to all connections in a room (e.g. activity updates).
 * Call from route handlers: emitToRoom(`tenant_${tenantId}`, "activity", data).
 */
export function emitToRoom(roomName: string, event: string, data: unknown): void {
  const set = rooms.get(roomName);
  if (!set) return;
  const payload = JSON.stringify({ event, data });
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

const socketioPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(import("@fastify/websocket"));

  fastify.get(WS_PATH, { websocket: true }, (socket: WebSocket, req) => {
    fastify.log.info({ url: req.url }, "WebSocket client connected");

    socket.on("message", (raw: Buffer | string) => {
      try {
        const text = typeof raw === "string" ? raw : raw.toString("utf8");
        const msg = JSON.parse(text) as { event?: string; tenant_id?: string };
        if (msg.event === "subscribe" && typeof msg.tenant_id === "string" && msg.tenant_id) {
          const roomName = `tenant_${msg.tenant_id}`;
          joinRoom(socket, roomName);
          fastify.log.info({ room: roomName }, "Client subscribed to tenant room");
        }
      } catch {
        // ignore malformed messages
      }
    });

    socket.on("close", () => {
      leaveAllRooms(socket);
      fastify.log.info("WebSocket client disconnected");
    });
  });
};

export default socketioPlugin;
