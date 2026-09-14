import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileContentStore } from "./FileContentStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";
const DATA_DIR = path.resolve(__dirname, process.env.DATA_DIR ?? "../data");

const store = new FileContentStore(DATA_DIR);

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJson(res, status, {
    error: message,
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      // Prevent accidentally accepting huge request bodies.
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJsonBody(req) {
  const body = await readBody(req);

  if (!body.trim()) {
    throw new Error("Request body is empty");
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Request body is not valid JSON");
  }
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function assertSafeId(id, label) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid ${label}`);
  }
}

async function handleRequest(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);

  /*
   * GET /health
   */
  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
    });
    return;
  }

  /*
   * Everything below is /api/...
   */
  if (parts[0] !== "api") {
    sendError(res, 404, "Not found");
    return;
  }

  /*
   * GET /api/projects
   */
  if (req.method === "GET" && parts.length === 2 && parts[1] === "projects") {
    const projects = await store.listProjects();

    sendJson(res, 200, projects);
    return;
  }

  /*
   * Everything else requires:
   *
   * /api/projects/:projectId/...
   */
  if (parts[1] !== "projects" || !parts[2]) {
    sendError(res, 404, "Not found");
    return;
  }

  const projectId = decodeURIComponent(parts[2]);

  assertSafeId(projectId, "project ID");

  /*
   * GET /api/projects/:projectId
   */
  if (parts.length === 3 && req.method === "GET") {
    const project = await store.getProject(projectId);

    if (!project) {
      sendError(res, 404, "Project not found");
      return;
    }

    sendJson(res, 200, project);
    return;
  }

  if (parts.length < 4) {
    sendError(res, 404, "Not found");
    return;
  }

  const collection = parts[3];

  const collections = {
    maps: {
      list: (projectId) => store.listMaps(projectId),
      get: (projectId, id) => store.getMap(projectId, id),
      save: (projectId, id, data) => store.saveMap(projectId, id, data),
    },

    "entity-datasets": {
      list: (projectId) => store.listEntityDatasets(projectId),
      get: (projectId, id) => store.getEntityDataset(projectId, id),
      save: (projectId, id, data) =>
        store.saveEntityDataset(projectId, id, data),
    },

    templates: {
      list: (projectId) => store.listTemplates(projectId),
      get: (projectId, id) => store.getTemplate(projectId, id),
      save: (projectId, id, data) => store.saveTemplate(projectId, id, data),
    },
  };

  const handler = collections[collection];

  if (!handler) {
    sendError(res, 404, "Unknown collection");
    return;
  }

  /*
   * GET /api/projects/:projectId/:collection
   */
  if (parts.length === 4 && req.method === "GET") {
    const documents = await handler.list(projectId);

    sendJson(res, 200, documents);
    return;
  }

  /*
   * GET/PUT
   * /api/projects/:projectId/:collection/:documentId
   */
  if (parts.length === 5) {
    const documentId = decodeURIComponent(parts[4]);

    assertSafeId(documentId, "document ID");

    if (req.method === "GET") {
      const document = await handler.get(projectId, documentId);

      if (!document) {
        sendError(res, 404, "Document not found");
        return;
      }

      sendJson(res, 200, document);
      return;
    }

    if (req.method === "PUT") {
      const data = await readJsonBody(req);

      await handler.save(projectId, documentId, data);

      sendJson(res, 200, {
        ok: true,
      });
      return;
    }
  }

  sendError(res, 404, "Not found");
}

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      sendError(
        res,
        error.message === "Request body is not valid JSON" ? 400 : 500,
        error.message,
      );
    } else {
      res.destroy();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Content server listening on http://${HOST}:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
