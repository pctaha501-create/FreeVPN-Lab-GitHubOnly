import { connect } from "cloudflare:sockets";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders },
  });
}

function uuidBytes(uuid) {
  const hex = (uuid || "").replaceAll("-", "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  return Uint8Array.from(hex.match(/.{2}/g), (pair) => parseInt(pair, 16));
}

function sameBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function parseVlessHeader(data, expectedUuid) {
  if (data.byteLength < 24) throw new Error("VLESS header too short");
  const bytes = new Uint8Array(data);
  const configured = uuidBytes(expectedUuid);
  if (!configured || !sameBytes(bytes.subarray(1, 17), configured)) {
    throw new Error("Invalid client UUID");
  }
  const version = bytes[0];
  const optionLength = bytes[17];
  let i = 18 + optionLength;
  if (bytes.byteLength < i + 4) throw new Error("Incomplete VLESS header");
  const command = bytes[i++];
  if (command !== 1) throw new Error("Only VLESS TCP command is supported");
  const port = (bytes[i++] << 8) | bytes[i++];
  const addressType = bytes[i++];
  let host;
  if (addressType === 1) {
    if (bytes.byteLength < i + 4) throw new Error("Incomplete IPv4 address");
    host = [...bytes.subarray(i, i + 4)].join(".");
    i += 4;
  } else if (addressType === 2) {
    const length = bytes[i++];
    if (bytes.byteLength < i + length) throw new Error("Incomplete domain address");
    host = new TextDecoder().decode(bytes.subarray(i, i + length));
    i += length;
  } else if (addressType === 3) {
    if (bytes.byteLength < i + 16) throw new Error("Incomplete IPv6 address");
    const parts = [];
    for (let j = 0; j < 16; j += 2) parts.push(((bytes[i + j] << 8) | bytes[i + j + 1]).toString(16));
    host = parts.join(":");
    i += 16;
  } else {
    throw new Error("Unsupported address type");
  }
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid destination");
  return { version, host, port, payload: bytes.slice(i) };
}

async function bridgeWebSocket(request, env) {
  const upgrade = request.headers.get("Upgrade");
  if (!upgrade || upgrade.toLowerCase() !== "websocket") {
    return new Response("WebSocket upgrade required", { status: 426, headers: corsHeaders });
  }
  if (!env.UUID) return new Response("Worker not configured: set the UUID secret", { status: 503 });

  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  server.accept();

  let socket;
  let writer;
  let closed = false;
  const closeAll = () => {
    if (closed) return;
    closed = true;
    try { writer?.releaseLock(); } catch {}
    try { socket?.close(); } catch {}
    try { server.close(); } catch {}
  };

  server.addEventListener("message", async (event) => {
    try {
      const incoming = event.data instanceof ArrayBuffer
        ? new Uint8Array(event.data)
        : event.data instanceof Blob
          ? new Uint8Array(await event.data.arrayBuffer())
          : null;
      if (!incoming) throw new Error("Binary WebSocket frames required");

      if (!socket) {
        const parsed = parseVlessHeader(incoming, env.UUID);
        socket = connect({ hostname: parsed.host, port: parsed.port });
        writer = socket.writable.getWriter();
        if (parsed.payload.byteLength) await writer.write(parsed.payload);
        const reply = new Uint8Array([parsed.version, 0]);
        server.send(reply);
        const reader = socket.readable.getReader();
        (async () => {
          try {
            while (!closed) {
              const { value, done } = await reader.read();
              if (done) break;
              if (server.readyState !== WebSocket.OPEN) break;
              server.send(value);
            }
          } catch {
            // Socket closure is expected when the client disconnects.
          } finally {
            try { reader.releaseLock(); } catch {}
            closeAll();
          }
        })();
      } else {
        await writer.write(incoming);
      }
    } catch {
      closeAll();
    }
  });

  server.addEventListener("close", closeAll);
  server.addEventListener("error", closeAll);
  return new Response(null, { status: 101, webSocket: client });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === "/health") {
      return json({ service: "FreeVPN Lab Worker", status: env.UUID ? "configured" : "needs_uuid_secret", transport: "VLESS over WebSocket", note: "Prototype: TCP destinations are subject to Cloudflare socket restrictions and plan limits." });
    }
    if (url.pathname === "/ws") return bridgeWebSocket(request, env);
    return json({ name: "FreeVPN Lab Worker", status: "online", endpoints: ["/health", "/ws"], docs: "https://github.com/pctaha501-create/FreeVPN-Lab-GitHubOnly" });
  },
};
