import path from "path";

import { getCurrentProjectId } from "../project";
import { requireSDK } from "../sdk";

import { readJson, writeJson } from "./persistence";

type StoreOptions<TModel, TMessage> = {
  filename: string;
  perProject?: boolean;
  initialModel: () => TModel;
  update: (model: TModel, message: TMessage) => TModel;
};

export abstract class Store<TModel, TMessage> {
  private current: TModel;
  private loadedPath: string | undefined;

  constructor(private readonly options: StoreOptions<TModel, TMessage>) {
    this.current = options.initialModel();
  }

  protected abstract parse(loaded: unknown): TModel | undefined;

  protected get model(): TModel {
    return this.current;
  }

  private filePath(): string {
    const { filename, perProject } = this.options;
    const projectId = perProject === true ? getCurrentProjectId() : undefined;
    return path.join(
      requireSDK().meta.path(),
      projectId === undefined ? `${filename}.json` : `${filename}-${projectId}.json`
    );
  }

  async load(): Promise<void> {
    const filePath = this.filePath();
    this.loadedPath = undefined;
    const loaded = this.parse(await readJson(filePath));
    if (filePath !== this.filePath()) return;
    this.current = loaded ?? this.options.initialModel();
    this.loadedPath = filePath;
  }

  protected save(): Promise<void> {
    return writeJson(this.filePath(), this.current);
  }

  protected async commit(message: TMessage): Promise<TModel> {
    // Saving before the current project's file is loaded would overwrite it with another project's data.
    if (this.loadedPath !== this.filePath()) {
      throw new Error(`${this.options.filename} store is not loaded`);
    }
    this.current = this.options.update(this.current, message);
    await this.save();
    return this.current;
  }
}
