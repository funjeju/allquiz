import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { QuizGenerationOutput } from "@/lib/schemas";
import { format } from "date-fns";

export async function saveQuizToFirestore(quiz: QuizGenerationOutput) {
  const today = format(new Date(), "yyyy-MM-dd");
  const quizDocRef = doc(db, "daily_quizzes", today);

  try {
    const docSnap = await getDoc(quizDocRef);

    if (!docSnap.exists()) {
      // 첫 카테고리인 경우 새 문서 생성
      await setDoc(quizDocRef, {
        [quiz.category]: [quiz],
        created_at: new Date().toISOString(),
      });
    } else {
      // 기존 문서에 카테고리 배열 업데이트
      await updateDoc(quizDocRef, {
        [quiz.category]: arrayUnion(quiz),
        updated_at: new Date().toISOString(),
      });
    }
    console.log(`Successfully saved quiz for ${quiz.category}`);
  } catch (error) {
    console.error("Error saving quiz to Firestore:", error);
    throw error;
  }
}
