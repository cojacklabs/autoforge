import { z } from "zod";

export const TUI_VIEW_IDS = [
  "dashboard",
  "active-work",
  "features",
  "issues",
  "tasks",
  "decisions",
  "context",
  "specifications",
  "doctrines",
  "agents",
  "health",
] as const;

export const tuiViewIdSchema = z.enum(TUI_VIEW_IDS);
export const tuiToneSchema = z.enum([
  "neutral",
  "positive",
  "warning",
  "negative",
  "muted",
]);
export const tuiRowSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(10_000),
    tone: tuiToneSchema.default("neutral"),
  })
  .strict();
export const tuiSectionSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    rows: z.array(tuiRowSchema),
  })
  .strict();
export const tuiViewModelSchema = z
  .object({
    id: tuiViewIdSchema,
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(2_000),
    sections: z.array(tuiSectionSchema),
    commands: z.array(z.string().trim().min(1).max(100)),
  })
  .strict();

export type TuiViewId = z.infer<typeof tuiViewIdSchema>;
export type TuiTone = z.infer<typeof tuiToneSchema>;
export type TuiRow = z.infer<typeof tuiRowSchema>;
export type TuiSection = z.infer<typeof tuiSectionSchema>;
export type TuiViewModel = z.infer<typeof tuiViewModelSchema>;
