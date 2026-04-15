import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { format } from "date-fns";
import { QuizGenerationOutput } from "@/lib/schemas";

export async function getTodayQuizzesByCategory(category: string): Promise<QuizGenerationOutput[]> {
  const today = format(new Date(), "yyyy-MM-dd");
  const docRef = doc(db, "daily_quizzes", today);

  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.warn("No quizzes found for today.");
      return [];
    }

    const data = docSnap.data();
    return data[category] || [];
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return [];
  }
}
