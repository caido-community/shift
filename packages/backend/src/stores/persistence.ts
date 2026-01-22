import { readFile, writeFile } from "fs/promises";
import path from "path";

export type Persistence = {
  save: (data: unknown) => Promise<void>;
  load: () => Promise<unknown>;
};

export type ProjectPersistence = Persistence & {
  switchProject: (projectId: string | undefined) => void;
};

export const defaultMergeStrategy = <T>(current: T, loaded: unknown): T => {
  if (Array.isArray(current)) {
    return loaded as T;
  }
  return Object.assign({}, current, loaded);
};

export const createGlobalPersistence = (basePath: string, filename: string): Persistence => {
  const getFilePath = () => path.join(basePath, `${filename}.json`);

  return {
    save: async (data) => {
      const filePath = getFilePath();
      await writeFile(filePath, JSON.stringify(data, null, 2));
    },
    load: async () => {
      const filePath = getFilePath();
      try {
        const fileData = await readFile(filePath, "utf-8");
        return JSON.parse(fileData);
      } catch {
        return undefined;
      }
    },
  };
};

export const createProjectPersistence = (
  basePath: string,
  filename: string
): ProjectPersistence => {
  let projectId: string | undefined;

  const getFilePath = () => {
    if (projectId === undefined) {
      return path.join(basePath, `${filename}.json`);
    }
    return path.join(basePath, `${filename}-${projectId}.json`);
  };

  return {
    switchProject: (id) => {
      projectId = id;
    },
    save: async (data) => {
      const filePath = getFilePath();
      await writeFile(filePath, JSON.stringify(data, null, 2));
    },
    load: async () => {
      const filePath = getFilePath();
      try {
        const fileData = await readFile(filePath, "utf-8");
        return JSON.parse(fileData);
      } catch {
        return undefined;
      }
    },
  };
};
