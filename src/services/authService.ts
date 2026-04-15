import { auth } from "@/lib/firebase";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { getOrCreateUserProfile } from "./userService";

const googleProvider = new GoogleAuthProvider();

/**
 * 구글 로그인 수행 및 유저 프로필 초기화
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Firestore 프로필 초기화
    await getOrCreateUserProfile(user.uid, user.displayName || "익명의 도전자");
    
    return user;
  } catch (error) {
    console.error("Google Sign In Error:", error);
    throw error;
  }
}

/**
 * 로그아웃
 */
export async function logout() {
  await signOut(auth);
}

/**
 * 인증 상태 구독
 */
export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
