import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileContentStore } from "./FileContentStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4000);

const HOST = process.env.HOST || "0.0.0.0";

const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../data");

const store = new FileContentStore(DATA_DIR);

function sendJson(response, status, data) {
  response.statusCode = status;

  response.setHeader("Content-Type", "application/json");

  response.end(JSON.stringify(data, null, 2));
}

function sendError(response, status, message) {
  sendJson(response, status, {
    error: message,
  });
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");

  response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");

  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => resolve(body));

    request.on("error", reject);
  });
}

async function readJsonBody(request) {
  const body = await readBody(request);

  if (!body.trim()) {
    throw new Error("Request body is required");
  }

  return JSON.parse(body);
}

function getPathParts(request) {
  const url = new URL(request.url, "http://localhost");

  return url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

async function handleRequest(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  const parts = getPathParts(request);

  // GET /health

  if (request.method === "GET" && parts.length === 1 && parts[0] === "health") {
    sendJson(response, 200, {
      ok: true,
    });

    return;
  }

  // Everything else starts with:
  //
  // /api/projects

  if (parts[0] !== "api" || parts[1] !== "projects") {
    sendError(response, 404, "Not found");

    return;
  }

  // GET /api/projects

  if (request.method === "GET" && parts.length === 2) {
    const projects = await store.listProjects();

    sendJson(response, 200, projects);

    return;
  }

  const projectId = parts[2];

  if (!projectId) {
    sendError(response, 400, "Project ID is required");

    return;
  }

  // GET /api/projects/:projectId

  if (request.method === "GET" && parts.length === 3) {
    const project = await store.getProject(projectId);

    if (!project) {
      sendError(response, 404, "Project not found");

      return;
    }

    sendJson(response, 200, project);

    return;
  }

  const collection = parts[3];
  const documentId = parts[4];

  // Maps

  if (collection === "maps") {
    if (request.method === "GET" && !documentId) {
      const maps = await store.listMaps(projectId);

      sendJson(response, 200, maps);

      return;
    }

    if (request.method === "GET" && documentId) {
      const map = await store.getMap(projectId, documentId);

      if (!map) {
        sendError(response, 404, "Map not found");

        return;
      }

      sendJson(response, 200, map);

      return;
    }

    if (request.method === "PUT" && documentId) {
      const data = await readJsonBody(request);

      await store.saveMap(projectId, documentId, data);

      sendJson(response, 200, {
        ok: true,
      });

      return;
    }
  }

  // Entity datasets

  if (collection === "entity-datasets") {
    if (request.method === "GET" && !documentId) {
      const datasets = await store.listEntityDatasets(projectId);

      sendJson(response, 200, datasets);

      return;
    }

    if (request.method === "GET" && documentId) {
      const dataset = await store.getEntityDataset(projectId, documentId);

      if (!dataset) {
        sendError(response, 404, "Entity dataset not found");

        return;
      }

      sendJson(response, 200, dataset);

      return;
    }

    if (request.method === "PUT" && documentId) {
      const data = await readJsonBody(request);

      await store.saveEntityDataset(projectId, documentId, data);

      sendJson(response, 200, {
        ok: true,
      });

      return;
    }
  }

  sendError(response, 404, "Not found");
}

const server = http.createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    console.error(error);

    if (error instanceof SyntaxError) {
      sendError(response, 400, "Invalid JSON");

      return;
    }

    sendError(response, 500, error.message || "Internal server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Content server running on http://${HOST}:${PORT}`);

  console.log(`Content directory: ${DATA_DIR}`);
});
