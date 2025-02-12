import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Server } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import ioSocket from "./socket/index.js";

interface ServerToClientEvents {
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
  hello: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

const app = new Hono();

const port = 3001;

const httpServer = serve({
  fetch: app.fetch,
  port,
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer as HTTPServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

ioSocket(io);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

console.log(`Server is running on http://localhost:${port}`);
