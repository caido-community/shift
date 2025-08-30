export type Todo = {
  id: string;
  content: string;
  internal_content?: string;
  status: "pending" | "completed";
};
