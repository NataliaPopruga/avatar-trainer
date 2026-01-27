import { z } from "zod";

export const EvaluationSchema = z.object({
  scores: z.object({
    correctness: z.number().min(0).max(100),
    compliance: z.number().min(0).max(100),
    softSkills: z.number().min(0).max(100),
    deEscalation: z.number().min(0).max(100),
  }),
  flags: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(["low", "med", "high"]),
      message: z.string(),
      evidenceChunkIds: z.array(z.string()),
    })
  ),
  positives: z.array(z.string()),
  improvements: z.array(z.string()),
  suggestedAnswer: z.string(),
  evidence: z.array(
    z.object({
      chunkId: z.string(),
      docTitle: z.string(),
      snippet: z.string(),
    })
  ),
});

export type EvaluationResult = z.infer<typeof EvaluationSchema>;
