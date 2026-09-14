import fs from "node:fs/promises";
import path from "node:path";

import { ContentStore } from "./ContentStore.js";

function isSafeId(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function assertSafeId(value, label) {
  if (!isSafeId(value)) {
    throw new Error(`Invalid ${label}: "${value}"`);
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function writeJsonAtomic(filePath, data) {
  const directory = path.dirname(filePath);

  await fs.mkdir(directory, {
    recursive: true,
  });

  const tempPath = `${filePath}.tmp`;

  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  await fs.rename(tempPath, filePath);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export class FileContentStore extends ContentStore {
  constructor(rootDir) {
    super();

    this.rootDir = rootDir;
    this.projectsDir = path.join(rootDir, "projects");
  }

  getProjectDir(projectId) {
    assertSafeId(projectId, "project ID");

    return path.join(this.projectsDir, projectId);
  }

  getProjectFile(projectId) {
    return path.join(this.getProjectDir(projectId), "project.json");
  }

  getCollectionDir(projectId, collection) {
    return path.join(this.getProjectDir(projectId), collection);
  }

  getDocumentFile(projectId, collection, documentId) {
    assertSafeId(documentId, "document ID");

    return path.join(
      this.getCollectionDir(projectId, collection),
      `${documentId}.json`,
    );
  }

  async listProjects() {
    if (!(await fileExists(this.projectsDir))) {
      return [];
    }

    const entries = await fs.readdir(this.projectsDir, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  async getProject(projectId) {
    const filePath = this.getProjectFile(projectId);

    if (!(await fileExists(filePath))) {
      return null;
    }

    return readJson(filePath);
  }

  async listMaps(projectId) {
    return this.listCollection(projectId, "maps");
  }

  async getMap(projectId, mapId) {
    return this.getDocument(projectId, "maps", mapId);
  }

  async saveMap(projectId, mapId, data) {
    return this.saveDocument(projectId, "maps", mapId, data);
  }

  async listEntityDatasets(projectId) {
    return this.listCollection(projectId, "entity-datasets");
  }

  async getEntityDataset(projectId, datasetId) {
    return this.getDocument(projectId, "entity-datasets", datasetId);
  }

  async saveEntityDataset(projectId, datasetId, data) {
    return this.saveDocument(projectId, "entity-datasets", datasetId, data);
  }

  async listCollection(projectId, collection) {
    const directory = this.getCollectionDir(projectId, collection);

    if (!(await fileExists(directory))) {
      return [];
    }

    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/, ""))
      .sort();
  }

  async getDocument(projectId, collection, documentId) {
    const filePath = this.getDocumentFile(projectId, collection, documentId);

    if (!(await fileExists(filePath))) {
      return null;
    }

    return readJson(filePath);
  }

  async saveDocument(projectId, collection, documentId, data) {
    const filePath = this.getDocumentFile(projectId, collection, documentId);

    await writeJsonAtomic(filePath, data);

    return data;
  }
}
