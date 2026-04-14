import { z } from "zod";

export const QuizSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  answer: z.string(),
});

export const ViralCopySchema = z.object({
  kakao_title: z.string(),
  kakao_taunt: z.string(),
});

export const QuizGenerationOutputSchema = z.object({
  category: z.string(),
  source_url: z.string().url(),
  base_fact: z.string(),
  quizzes: z.object({
    teen: QuizSchema,
    adult: QuizSchema,
  }),
  viral_copy: ViralCopySchema,
  explanation: z.object({
    correct: z.string(),
    wrong: z.string(),
  }).optional(),
  quiz_type: z.enum(["MULTIPLE_CHOICE", "OX", "SPEED", "TRAP"]).default("MULTIPLE_CHOICE"),
  trap_options: z.array(z.string()).optional(),
});

export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;
