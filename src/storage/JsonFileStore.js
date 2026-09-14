import fs from "node:fs/promises";
import path from "node:path";

import { ContentStore } from "./ContentStore.js";
import { config } from "../config.js";

export class JsonFileStore extends ContentStore {
  constructor(rootDirectory = config.contentRoot) {
    super();

    this.rootDirectory = rootDirectory;
  }

  getProjectDirectory(project) {
    return path.join(this.rootDirectory, project);
  }

  getTypeDirectory(project, type) {
    return path.join(this.getProjectDirectory(project), type);
  }

  getDocumentPath(project, type, name) {
    return path.join(this.getTypeDirectory(project, type), `${name}.json`);
  }

  async ensureRootDirectory() {
    await fs.mkdir(this.rootDirectory, {
      recursive: true,
    });
  }

  async listProjects() {
    await this.ensureRootDirectory();

    const entries = await fs.readdir(this.rootDirectory, {
      withFileTypes: true,
    });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  async listDocuments(project, type) {
    const directory = this.getTypeDirectory(project, type);

    try {
      const entries = await fs.readdir(directory, {
        withFileTypes: true,
      });

      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map((entry) => entry.name.slice(0, -".json".length))
        .sort();
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }

      throw error;
    }
  }

  async getDocument(project, type, name) {
    const filePath = this.getDocumentPath(project, type, name);

    try {
      const contents = await fs.readFile(filePath, "utf8");

      return JSON.parse(contents);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }

      if (error instanceof SyntaxError) {
        throw new Error(
          `Invalid JSON in stored document: ${project}/${type}/${name}.json`,
        );
      }

      throw error;
    }
  }

  async saveDocument(project, type, name, data) {
    const directory = this.getTypeDirectory(project, type);

    await fs.mkdir(directory, {
      recursive: true,
    });

    const filePath = this.getDocumentPath(project, type, name);

    const contents = JSON.stringify(data, null, 2) + "\n";

    await fs.writeFile(filePath, contents, "utf8");

    return data;
  }
}
