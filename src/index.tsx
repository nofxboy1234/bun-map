import { serve } from "bun";
import index from "@/index.html";
import {
  cancelSubscription,
  ensureSubscriber,
  getSubscriberStatus,
  hasActiveSubscription,
  subscribeMonthly,
} from "@/services/subscriptions";
import { createMapSession, listMapPresets } from "@/services/maps";

console.log(`backend: ${process.env.BUN_PUBLIC_HELLO}`);
console.log(`backend: ${process.env.GOODBYE}`);

const isDevelopment = process.env.NODE_ENV !== "production";

type EmailBody = {
  email?: unknown;
  mapId?: unknown;
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

function errorJson(message: string, status = 400) {
  return json({ error: message }, status);
}

function parseEmailField(body: EmailBody) {
  if (typeof body.email !== "string") {
    throw new Error("Missing `email` in request body.");
  }

  return body.email;
}

async function parseBody(req: Request): Promise<EmailBody> {
  try {
    return (await req.json()) as EmailBody;
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

const server = serve({
  routes: {
    "/api/hello": {
      async GET(_req: Request) {
        return json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(_req: Request) {
        return json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },
    "/api/subscriptions/subscriber": {
      async POST(req: Request) {
        try {
          const body = await parseBody(req);
          const email = parseEmailField(body);
          const result = await ensureSubscriber(email);
          return json(result);
        } catch (error) {
          return errorJson(error instanceof Error ? error.message : "Failed to ensure subscriber.");
        }
      },
    },
    "/api/subscriptions/status": {
      async GET(req: Request) {
        const url = new URL(req.url);
        const email = url.searchParams.get("email");

        if (!email) {
          return errorJson("Missing `email` query parameter.");
        }

        try {
          const result = await getSubscriberStatus(email);
          return json(result);
        } catch (error) {
          return errorJson(
            error instanceof Error ? error.message : "Failed to get subscription status.",
          );
        }
      },
    },
    "/api/subscriptions/subscribe": {
      async POST(req: Request) {
        try {
          const body = await parseBody(req);
          const email = parseEmailField(body);
          const result = await subscribeMonthly(email);
          return json(result);
        } catch (error) {
          return errorJson(error instanceof Error ? error.message : "Failed to subscribe.");
        }
      },
    },
    "/api/subscriptions/cancel": {
      async POST(req: Request) {
        try {
          const body = await parseBody(req);
          const email = parseEmailField(body);
          const result = await cancelSubscription(email);
          return json(result);
        } catch (error) {
          return errorJson(
            error instanceof Error ? error.message : "Failed to cancel subscription.",
          );
        }
      },
    },
    "/api/maps": {
      async GET() {
        return json({ maps: listMapPresets() });
      },
    },
    "/api/maps/session": {
      async GET(req: Request) {
        const url = new URL(req.url);
        const email = url.searchParams.get("email");
        const mapId = url.searchParams.get("mapId") ?? "";

        if (!email) {
          return errorJson("Missing `email` query parameter.");
        }

        try {
          const hasAccess = await hasActiveSubscription(email);

          if (!hasAccess) {
            return errorJson("Active subscription required to access maps.", 403);
          }

          const session = createMapSession(mapId, email);
          return json(session);
        } catch (error) {
          return errorJson(
            error instanceof Error ? error.message : "Failed to create map session.",
          );
        }
      },
    },
    "/users/:id": (req: Bun.BunRequest<"/users/:id">) => {
      return new Response(`Hello user ${req.params.id}`);
    },
    // Serve the SPA for all unmatched routes.
    "/*": index,
  },

  development: isDevelopment && {
    // Enable browser hot reloading in development.
    hmr: true,

    // Echo browser console logs in the server process.
    console: true,
  },
});

function openInBrowser(url: string) {
  const command =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];

  try {
    Bun.spawn(command, {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
      detached: true,
    }).unref();
  } catch (err) {
    console.error("Failed to open browser URL", err);
  }
}

if (isDevelopment && process.stdin.isTTY) {
  process.stdin.setEncoding("utf8");
  process.stdin.resume();
  process.stdin.on("data", (chunk: string) => {
    if (chunk.trim().toLowerCase() === "o") {
      openInBrowser(server.url.href);
    }
  });
  console.log("⌨️  Press o + Enter to open in browser.");
}

console.log(`🚀 Server running at ${server.url}`);
console.log(`🧭 Server mode: spa (${isDevelopment ? "development" : "production"})`);
