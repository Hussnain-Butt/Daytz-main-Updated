// File: src/services/internal/UserService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { User, CreateUserInternalData, UpdateUserPayload } from '../../types/User'
import UserRepository from '../../repository/UserRepository'
import ZipcodeService from '../external/ZipcodeService'
import { PoolClient } from 'pg'

const MONTHLY_REPLENISH_AMOUNT = 100
const REFERRAL_BONUS_COINS = 10

class UserService {
  private userRepository: UserRepository
  private zipcodeService: ZipcodeService

  constructor() {
    this.userRepository = new UserRepository()
    this.zipcodeService = new ZipcodeService()
    console.log('[UserService] UserRepository and ZipcodeService instances created.')
  }

  async getUserZipcode(userId: string): Promise<string | null> {
    const user = await this.userRepository.getUserById(userId)
    return user?.zipcode || null
  }

  async updateUser(userId: string, updateData: UpdateUserPayload): Promise<User | null> {
    console.log(`[UserService.updateUser] Updating user ${userId} with:`, updateData)

    if (Object.keys(updateData).length === 0) {
      return this.getUserById(userId)
    }

    if (updateData.zipcode) {
      const currentUser = await this.userRepository.getUserById(userId)
      if (
        currentUser &&
        (currentUser.zipcode !== updateData.zipcode ||
          !currentUser.latitude ||
          !currentUser.longitude)
      ) {
        console.log(
          `[UserService.updateUser] Zipcode changed or coordinates missing. Fetching new coordinates for ${updateData.zipcode}...`,
        )
        const coords = await this.zipcodeService.getCoordsForZip(updateData.zipcode)
        if (coords) {
          console.log(`[UserService.updateUser] Found new coordinates:`, coords)
          updateData.latitude = coords.latitude
          updateData.longitude = coords.longitude
        } else {
          console.warn(
            `[UserService.updateUser] Could not find coordinates for zipcode ${updateData.zipcode}. Lat/Lon will be set to null.`,
          )
          updateData.latitude = null
          updateData.longitude = null
        }
      }
    }

    if (updateData.referralSource) {
      const currentUser = await this.userRepository.getUserById(userId)
      if (currentUser && !currentUser.referralSource && updateData.referralSource.trim() !== '') {
        const newTotalTokens = (currentUser.tokens || 0) + REFERRAL_BONUS_COINS
        updateData.tokens = newTotalTokens
      }
    }

    return this.userRepository.updateUser(userId, updateData)
  }

  async createUser(userData: CreateUserInternalData): Promise<User | null> {
    console.log('[UserService.createUser] Attempting with data:', userData)

    let latitude: number | null = null
    let longitude: number | null = null
    if (userData.zipcode) {
      const coords = await this.zipcodeService.getCoordsForZip(userData.zipcode)
      if (coords) {
        latitude = coords.latitude
        longitude = coords.longitude
      }
    }

    const payloadForRepo: Partial<User> = {
      userId: userData.userId,
      email: userData.email,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      zipcode: userData.zipcode || null,
      tokens: 100,
      enableNotifications: true,
      is_profile_complete: false,
      latitude,
      longitude,
      // hasSeenCalendarTutorial will be set to false by default in the repository
    }

    const createdUser = await this.userRepository.createUser(payloadForRepo)
    if (createdUser) {
      console.log(
        `[UserService.createUser] User created successfully. UserID: ${createdUser.userId}, Email: ${createdUser.email}, Coords: (${createdUser.latitude}, ${createdUser.longitude})`,
      )
    }
    return createdUser
  }

  // ✅ PERSISTENT TUTORIAL: New method to update the user's tutorial status.
  async markCalendarTutorialAsSeen(userId: string): Promise<User | null> {
    console.log(
      `[UserService.markCalendarTutorialAsSeen] Marking tutorial as seen for user ${userId}.`,
    )
    return this.userRepository.updateUser(userId, { hasSeenCalendarTutorial: true })
  }

  async blockUser(blockerId: string, blockedId: string): Promise<boolean> {
    console.log(`[UserService.blockUser] User ${blockerId} attempting to block ${blockedId}`)
    if (blockerId === blockedId) {
      throw new Error('You cannot block yourself.')
    }
    const blockedUserExists = await this.userRepository.getUserById(blockedId)
    if (!blockedUserExists) {
      throw new Error('User to be blocked not found.')
    }
    return this.userRepository.blockUser(blockerId, blockedId)
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
    console.log(`[UserService.unblockUser] User ${blockerId} attempting to unblock ${blockedId}`)
    return this.userRepository.unblockUser(blockerId, blockedId)
  }

  async getBlockedUsers(blockerId: string): Promise<User[]> {
    console.log(`[UserService.getBlockedUsers] Fetching blocked users for ${blockerId}`)
    return this.userRepository.getBlockedUsers(blockerId)
  }

  async spendTokensForUser(
    userId: string,
    amount: number,
    reason: string,
    client: PoolClient | null = null,
  ): Promise<User | null> {
    console.log(
      `[UserService.spendTokensForUser] User ${userId} attempting to spend ${amount} tokens for: ${reason}.`,
    )
    if (amount <= 0) {
      throw new Error('Amount to spend must be positive.')
    }
    return this.userRepository.spendUserTokens(userId, amount, client)
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.getUserById(userId)
  }

  async deleteUser(userId: string): Promise<boolean> {
    console.log(`[UserService.deleteUser] Attempting to delete user ID: ${userId}`)
    return this.userRepository.deleteUser(userId)
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.getAllUsers()
  }

  async replenishAllUsersMonthlyTokens(): Promise<{ successCount: number; errorCount: number }> {
    console.log(
      '[UserService.replenishAllUsersMonthlyTokens] Starting monthly token replenishment.',
    )
    try {
      const updatedCount = await this.userRepository.replenishAllUserTokens(
        MONTHLY_REPLENISH_AMOUNT,
      )
      return { successCount: updatedCount, errorCount: 0 }
    } catch (error) {
      console.error('[UserService.replenishAllUsersMonthlyTokens] Error:', error)
      return { successCount: 0, errorCount: -1 }
    }
  }

  async grantTokensToUser(userId: string, amount: number, reason: string): Promise<User | null> {
    console.log(
      `[UserService.grantTokensToUser] Granting ${amount} tokens to user ${userId} for: ${reason}.`,
    )
    if (amount <= 0) {
      throw new Error('Amount to grant must be positive.')
    }
    try {
      const user = await this.userRepository.getUserById(userId)
      if (!user) {
        return null
      }
      const newTotal = (user.tokens || 0) + amount
      return this.userRepository.updateUser(userId, { tokens: newTotal })
    } catch (error: any) {
      console.error(`[UserService.grantTokensToUser] Error: ${error.message}`)
      throw error
    }
  }
}

export default UserService
