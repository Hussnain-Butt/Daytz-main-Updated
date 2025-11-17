import { create } from 'zustand';
// ✅ PERSISTENT TUTORIAL: Update the User type import to include the new field
import { User } from '../types/User'; // Make sure your User type in types/User.ts has `hasSeenCalendarTutorial?: boolean;`
import { getUserById, getUserTokenBalance as fetchTokenBalanceApi } from '../api/api';

// 1. Define the state structure
interface UserState {
  userProfile: User | null;
  tokenBalance: number | null;
  isLoggedIn: boolean;
  isFetchingTokenBalance: boolean;
  isFetchingUserProfile: boolean;
  profileJustCompletedForNav: boolean;
  showThankYouAfterAuth: boolean;
  showWelcomeVideo: boolean;
  hasBeenForcedToProfileEdit: boolean;

  // This state is no longer needed as we will rely on the userProfile's property
  // showCalendarTutorial: boolean;

  setUserProfile: (profile: User | null) => void;
  updateUserProfileOptimistic: (updates: Partial<User>) => void;
  clearUserProfile: () => void;
  setTokenBalance: (balance: number | null) => void;
  setIsFetchingTokenBalance: (isFetching: boolean) => void;
  setIsFetchingUserProfile: (isFetching: boolean) => void;
  setProfileJustCompletedForNav: (isCompleted: boolean) => void;
  setShowThankYouAfterAuth: (show: boolean) => void;
  clearShowThankYouAfterAuth: () => void;
  setShowWelcomeVideo: (show: boolean) => void;
  setHasBeenForcedToProfileEdit: (hasBeenForced: boolean) => void;

  // This action is also no longer needed
  // setShowCalendarTutorial: (show: boolean) => void;
}

// 2. Create the store
export const useUserStore = create<UserState>((set) => ({
  // --- Initial State ---
  userProfile: null,
  tokenBalance: null,
  isLoggedIn: false,
  isFetchingTokenBalance: false,
  isFetchingUserProfile: false,
  profileJustCompletedForNav: false,
  showThankYouAfterAuth: false,
  showWelcomeVideo: false,
  hasBeenForcedToProfileEdit: false,

  // --- Actions ---
  setUserProfile: (profile) => {
    console.log('useUserStore: Setting userProfile:', profile ? `ID: ${profile.userId}` : 'null');
    if (profile) {
      set({
        userProfile: profile,
        isLoggedIn: true,
        isFetchingUserProfile: false,
        tokenBalance: typeof profile.tokens === 'number' ? profile.tokens : null,
      });
      if (typeof profile.tokens === 'number') {
        console.log(
          `useUserStore: Initial tokenBalance set from profile.tokens: ${profile.tokens}`
        );
      }
    } else {
      set({
        userProfile: null,
        tokenBalance: null,
        isLoggedIn: false,
        isFetchingUserProfile: false,
      });
    }
  },

  // ✅ PERSISTENT TUTORIAL: This function is now very important
  updateUserProfileOptimistic: (updates) => {
    set((state) => {
      if (!state.userProfile) return {};
      console.log('Optimistically updating user profile with:', updates);
      return { userProfile: { ...state.userProfile, ...updates } };
    });
  },

  clearUserProfile: () => {
    console.log('useUserStore: Clearing all user state and setting isLoggedIn to false.');
    set({
      userProfile: null,
      tokenBalance: null,
      isLoggedIn: false,
      isFetchingTokenBalance: false,
      isFetchingUserProfile: false,
      profileJustCompletedForNav: false,
      showThankYouAfterAuth: false,
      showWelcomeVideo: false,
      hasBeenForcedToProfileEdit: false,
    });
  },

  setTokenBalance: (balance) => set({ tokenBalance: balance }),
  setIsFetchingTokenBalance: (isFetching) => set({ isFetchingTokenBalance: isFetching }),
  setIsFetchingUserProfile: (isFetching) => set({ isFetchingUserProfile: isFetching }),
  setProfileJustCompletedForNav: (isCompleted) => set({ profileJustCompletedForNav: isCompleted }),
  setShowThankYouAfterAuth: (show) => set({ showThankYouAfterAuth: show }),
  clearShowThankYouAfterAuth: () => {
    console.log('useUserStore: Clearing showThankYouAfterAuth flag.');
    set({ showThankYouAfterAuth: false });
  },
  setShowWelcomeVideo: (show) => set({ showWelcomeVideo: show }),
  setHasBeenForcedToProfileEdit: (hasBeenForced) =>
    set({ hasBeenForcedToProfileEdit: hasBeenForced }),
}));

// --- Helper Functions ---

export const fetchAndSetUserProfile = async (userId: string): Promise<User | null> => {
  // ... (This function remains unchanged, it will now fetch the new field automatically)
  const { isFetchingUserProfile, setIsFetchingUserProfile, setUserProfile } =
    useUserStore.getState();
  if (isFetchingUserProfile) {
    console.log('fetchAndSetUserProfile: Already fetching profile. Aborting.');
    return useUserStore.getState().userProfile;
  }
  setIsFetchingUserProfile(true);
  try {
    const response = await getUserById(userId);
    if (response.data) {
      console.log(`fetchAndSetUserProfile: API Success for ${userId}. Updating store.`);
      setUserProfile(response.data);
      return response.data;
    } else if (response.status === 404) {
      console.log(`fetchAndSetUserProfile: User ${userId} not found (404). Clearing profile.`);
      setUserProfile(null);
      return null;
    } else {
      throw new Error(`Failed to fetch user profile. Status: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`fetchAndSetUserProfile: CRITICAL Error for ${userId}:`, error.message);
    useUserStore.getState().setUserProfile(null);
    throw error;
  } finally {
    setIsFetchingUserProfile(false);
  }
};

export const fetchAndUpdateTokenBalance = async (): Promise<number | null> => {
  // ... (This function remains unchanged)
  const { userProfile, setIsFetchingTokenBalance, setTokenBalance, isFetchingTokenBalance } =
    useUserStore.getState();
  if (!userProfile?.userId) return null;
  if (isFetchingTokenBalance) return useUserStore.getState().tokenBalance;
  setIsFetchingTokenBalance(true);
  try {
    const response = await fetchTokenBalanceApi();
    if (response.data && typeof response.data.tokenBalance === 'number') {
      const newBalance = response.data.tokenBalance;
      setTokenBalance(newBalance);
      return newBalance;
    } else {
      throw new Error('Invalid token balance data from API.');
    }
  } catch (error: any) {
    console.error(`fetchAndUpdateTokenBalance: Error fetching balance:`, error.message);
    throw error;
  } finally {
    setIsFetchingTokenBalance(false);
  }
};
