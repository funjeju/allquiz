import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export interface UserDemographics {
  birth_year: number;
  region: string;
  gender: string;
}

export interface UserProfile {
  uid: string;
  nickname: string;
  demographics?: UserDemographics;
  inventory: {
    golden_tickets: number;
    shield_items: number;
  };
  viral_stats: {
    total_shared: number;
    successful_invites: number;
  };
}

/**
 * 사용자 프로필 조회 또는 초기 생성
 */
export async function getOrCreateUserProfile(uid: string, nickname: string): Promise<UserProfile> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }

  // 초기 프로필 생성
  const newUser: UserProfile = {
    uid,
    nickname,
    inventory: { golden_tickets: 5, shield_items: 2 }, // 초기 보상
    viral_stats: { total_shared: 0, successful_invites: 0 },
  };

  await setDoc(userRef, newUser);
  return newUser;
}

/**
 * 온보딩 정보(데모그래픽) 업데이트
 */
export async function updateUserDemographics(uid: string, demographics: UserDemographics) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    demographics,
    updated_at: new Date().toISOString(),
  });
}
