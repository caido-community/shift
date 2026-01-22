import { requireSDK } from "../sdk";

import { createGlobalPersistence, defaultMergeStrategy, type Persistence } from "./persistence";

export abstract class GlobalStore<TModel, TMessage> {
  private model: TModel;
  private subscribers = new Set<(data: TModel) => void>();
  private persistence: Persistence;

  constructor(filename: string) {
    this.model = this.createInitialModel();
    const sdk = requireSDK();
    this.persistence = createGlobalPersistence(sdk.meta.path(), filename);
  }

  protected abstract createInitialModel(): TModel;
  protected abstract update(model: TModel, message: TMessage): TModel;

  dispatch(message: TMessage): void {
    this.model = this.update(this.model, message);
  }

  async initialize(): Promise<void> {
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
