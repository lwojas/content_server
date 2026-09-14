import fs from "node:fs/promises";
import path from "node:path";

import { ContentStore } from "./ContentStore.js";

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

function assertSafeId(id, label = "ID") {
  if (!SAFE_ID.test(id)) {
    throw new Error(`Invalid ${label}: "${id}"`);
  }
}

export class FileContentStore extends ContentStore {
  constructor(dataDir) {
    super();
    this.dataDir = dataDir;
  }

  projectDir(projectId) {
    assertSafeId(projectId, "project ID");
    return path.join(this.dataDir, "projects", projectId);
  }

  collectionDir(projectId, collection) {
    return path.join(this.projectDir(projectId), collection);
  }

  documentPath(projectId, collection, id) {
    assertSafeId(id, "document ID");
    return path.join(this.collectionDir(projectId, collection), `${id}.json`);
  }

  async readJson(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }

  async writeJson(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const tempPath = `${filePath}.tmp`;

    await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

    await fs.rename(tempPath, filePath);
  }

  async listDocuments(projectId, collection) {
    const dir = this.collectionDir(projectId, collection);

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      return entries
        .filter(
          (entry) =>
            entry.isFile() &&
            entry.name.endsWith(".json") &&
            !entry.name.endsWith(".tmp"),
        )
        .map((entry) => entry.name.replace(/\.json$/, ""))
        .sort();
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  async getDocument(projectId, collection, id) {
    const filePath = this.documentPath(projectId, collection, id);
    return this.readJson(filePath);
  }

  async saveDocument(projectId, collection, id, data) {
    const filePath = this.documentPath(projectId, collection, id);
    await this.writeJson(filePath, data);
  }

  async listProjects() {
    const projectsDir = path.join(this.dataDir, "projects");

    try {
      const entries = await fs.readdir(projectsDir, {
        withFileTypes: true,
      });

      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((id) => SAFE_ID.test(id))
        .sort();
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  async getProject(projectId) {
    return this.readJson(path.join(this.projectDir(projectId), "project.json"));
  }

  async listMaps(projectId) {
    return this.listDocuments(projectId, "maps");
  }

  async getMap(projectId, mapId) {
    return this.getDocument(projectId, "maps", mapId);
  }

  async saveMap(projectId, mapId, data) {
    return this.saveDocument(projectId, "maps", mapId, data);
  }

  async listEntityDatasets(projectId) {
    return this.listDocuments(projectId, "entity-datasets");
  }

  async getEntityDataset(projectId, datasetId) {
    return this.getDocument(projectId, "entity-datasets", datasetId);
  }

  async saveEntityDataset(projectId, datasetId, data) {
    return this.saveDocument(projectId, "entity-datasets", datasetId, data);
  }

  async listTemplates(projectId) {
    return this.listDocuments(projectId, "templates");
  }

  async getTemplate(projectId, templateId) {
    return this.getDocument(projectId, "templates", templateId);
  }

  async saveTemplate(projectId, templateId, data) {
    return this.saveDocument(projectId, "templates", templateId, data);
  }
}
