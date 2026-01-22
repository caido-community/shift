import { requireSDK } from "../sdk";

import {
  createProjectPersistence,
  defaultMergeStrategy,
  type ProjectPersistence,
} from "./persistence";

export abstract class ProjectStore<TModel, TMessage> {
  private model: TModel;
  private subscribers = new Set<(data: TModel) => void>();
  private persistence: ProjectPersistence;

  constructor(filename: string) {
    this.model = this.createInitialModel();
    const sdk = requireSDK();
    this.persistence = createProjectPersistence(sdk.meta.path(), filename);
  }

  protected abstract createInitialModel(): TModel;
  protected abstract update(model: TModel, message: TMessage): TModel;

  dispatch(message: TMessage): void {
    this.model = this.update(this.model, message);
  }

  async initialize(): Promise<void> {
    const sdk = requireSDK();
    const project = await sdk.projects.getCurrent();
    this.persistence.switchProject(project?.getId());
    await this.load();
  }

  async switchProject(projectID: string | undefined): Promise<void> {
    this.persistence.switchProject(projectID);
    this.model = this.createInitialModel();
    await this.load();
  }

  private async load(): Promise<void> {
    const loaded = await this.persistence.load();
    if (loaded !== undefined) {
      this.model = defaultMergeStrategy(this.model, loaded);
      this.notify();
    } else {
      await this.persist();
    }
  }

  protected async persist(): Promise<void> {
    await this.persistence.save(this.model);
  }

  protected getModel(): TModel {
    return this.model;
  }

  subscribe(subscriber: (data: TModel) => void): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  protected notify(): void {
    for (const subscriber of this.subscribers) {
      subscriber(this.model);
    }
  }
}
