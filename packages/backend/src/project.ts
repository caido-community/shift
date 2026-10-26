import { Result, type SkillScope } from "shared";

let currentProjectId: string | undefined;

export function getCurrentProjectId(): string | undefined {
  return currentProjectId;
}

export function setCurrentProjectId(projectId: string | undefined): void {
  currentProjectId = projectId;
}

export function requireProjectId(): Result<string> {
  if (currentProjectId === undefined) {
    return Result.err("This requires an active project");
  }
  return Result.ok(currentProjectId);
}

export function projectIdForScope(scope: SkillScope | undefined): Result<string | undefined> {
  return scope === "project" ? requireProjectId() : Result.ok(undefined);
}

export function isVisibleInCurrentProject(item: {
  scope: SkillScope;
  projectId?: string;
}): boolean {
  return (
    item.scope === "global" ||
    (currentProjectId !== undefined && item.projectId === currentProjectId)
  );
}
