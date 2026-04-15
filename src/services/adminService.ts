import { QuizGenerationOutput } from "@/lib/schemas";
import { saveQuizToFirestore } from "./quizService";

/**
 * 관리자가 직접 퀴즈를 출제합니다.
 */
export async function submitManualQuiz(quiz: QuizGenerationOutput) {
  try {
    // Phase 2에서 만든 저장 로직을 재사용합니다.
    await saveQuizToFirestore(quiz);
    return { success: true };
  } catch (error) {
    console.error("Admin Quiz Submission Error:", error);
    throw error;
  }
}
