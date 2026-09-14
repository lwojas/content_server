/**
 * Storage interface for content documents.
 *
 * The HTTP layer should only depend on this interface.
 *
 * A future implementation could be:
 *
 *   MongoContentStore
 *   S3ContentStore
 *   PostgresContentStore
 *
 * without changing the API routes.
 */
export class ContentStore {
  async listProjects() {
    throw new Error("listProjects() not implemented");
  }

  async listDocuments(project, type) {
    throw new Error("listDocuments() not implemented");
  }

  async getDocument(project, type, name) {
    throw new Error("getDocument() not implemented");
  }

  async saveDocument(project, type, name, data) {
    throw new Error("saveDocument() not implemented");
  }
}
