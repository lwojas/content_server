export class ContentStore {
  async listProjects() {
    throw new Error("ContentStore.listProjects() must be implemented");
  }

  async getProject(projectId) {
    throw new Error("ContentStore.getProject() must be implemented");
  }

  async listMaps(projectId) {
    throw new Error("ContentStore.listMaps() must be implemented");
  }

  async getMap(projectId, mapId) {
    throw new Error("ContentStore.getMap() must be implemented");
  }

  async saveMap(projectId, mapId, data) {
    throw new Error("ContentStore.saveMap() must be implemented");
  }

  async listEntityDatasets(projectId) {
    throw new Error("ContentStore.listEntityDatasets() must be implemented");
  }

  async getEntityDataset(projectId, datasetId) {
    throw new Error("ContentStore.getEntityDataset() must be implemented");
  }

  async saveEntityDataset(projectId, datasetId, data) {
    throw new Error("ContentStore.saveEntityDataset() must be implemented");
  }
}
