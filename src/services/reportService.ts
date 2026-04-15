import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from "firebase/firestore";

export type ReportReason = "정답 오류" | "사실 오류" | "부적절한 내용" | "문제 수준 부적절" | "기타";

export interface QuizReport {
  id?: string;
  date: string;           // KST YYYY-MM-DD
  category: string;
  base_fact: string;
  source_url: string;
  question: string;       // 신고된 문제 텍스트
  reason: ReportReason;
  note: string;           // 추가 의견
  reported_by: string;    // user uid
  created_at: string;
}

export async function reportQuiz(report: Omit<QuizReport, "id" | "created_at">) {
  await addDoc(collection(db, "quiz_reports"), {
    ...report,
    created_at: new Date().toISOString(),
  });
}

export async function getAllReports(): Promise<QuizReport[]> {
  const q = query(collection(db, "quiz_reports"), orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as QuizReport));
}

export async function deleteReport(reportId: string) {
  await deleteDoc(doc(db, "quiz_reports", reportId));
}
