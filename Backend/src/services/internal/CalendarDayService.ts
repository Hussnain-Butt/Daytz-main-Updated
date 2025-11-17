// File: src/services/internal/CalendarDayService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import {
  CalendarDay,
  CreateCalendarDay,
  UpdateCalendarDay,
  NearbyVideoData,
  StoryQueryResultWithUrl,
} from '../../types/CalendarDay'

import CalendarDayRepository from '../../repository/CalendarDayRepository'
import VimeoService from '../external/VimeoService'
import UserService from './UserService' // ZipcodeService ki ab yahan zaroorat nahi

class CalendarDayService {
  private calendarDayRepository: CalendarDayRepository
  private vimeoService: VimeoService
  private userService: UserService

  constructor() {
    this.calendarDayRepository = new CalendarDayRepository()
    this.vimeoService = new VimeoService()
    this.userService = new UserService()
    console.log('[CalendarDayService] Initialized.')
  }

  // ✅✅✅ <<-- YAHAN SABSE BADI TABDEELI HAI -->> ✅✅✅
  async getStoriesForDateWithFreshUrls(
    date: string,
    loggedInUserId: string,
  ): Promise<StoryQueryResultWithUrl[] | null> {
    // 1. Logged-in user ka data (aur coordinates) check karein
    const loggedInUser = await this.userService.getUserById(loggedInUserId)

    if (!loggedInUser || !loggedInUser.latitude || !loggedInUser.longitude) {
      console.warn(
        `[Service:GetStories] CRITICAL: User ${loggedInUserId} has no latitude/longitude. Cannot find nearby stories. Returning empty list.`,
      )
      return [] // User ke coordinates nahi hain to qareebi stories nahi mil saktin
    }

    // 2. Repository se સીધી (directly) nearby stories fetch karein.
    // Ab hazaaron zipcodes ki list nahi bhejni.
    const storiesFromRepo = await this.calendarDayRepository.findNearbyStoriesByDate(
      date,
      loggedInUserId,
      loggedInUser.latitude,
      loggedInUser.longitude,
    )

    if (storiesFromRepo === null) {
      console.error(`[Service:GetStories] Repository returned null for date: ${date}. DB error.`)
      return null
    }

    if (storiesFromRepo.length === 0) {
      console.log(
        `[Service:GetStories] Repository found 0 stories for the given date and location.`,
      )
      return []
    }

    // 3. Block kiye gaye users ko filter karein (yeh pehle se tha, aur zaroori hai)
    // Note: DB query mein pehle se `isBlocked` flag aa raha hai, to alag se check zaroori nahi,
    // lekin agar UI pe block/unblock live karna ho to yeh logic kaam aa sakti hai.
    // Abhi ke liye DB par bharosa karte hain.

    // 4. Videos ke liye fresh URLs fetch karein
    const storiesWithUrls = await Promise.all(
      storiesFromRepo.map(async (story) => {
        let playableUrl: string | null = null
        if (story.processingStatus === 'complete' && story.vimeoUri) {
          try {
            playableUrl = await this.vimeoService.getFreshPlayableUrl(story.vimeoUri)
          } catch (fetchErr) {
            console.error(
              `[Service:GetStories] Error fetching fresh URL for ${story.vimeoUri}:`,
              fetchErr,
            )
          }
        }
        return { ...story, playableUrl: playableUrl }
      }),
    )

    return storiesWithUrls
  }

  // --- Baaki sabhi service methods bilkul waise hi rahenge ---

  async createCalendarDay(calendarDay: CreateCalendarDay): Promise<CalendarDay | null> {
    return this.calendarDayRepository.createCalendarDay(calendarDay)
  }

  async getCalendarDaysByUserId(userId: string): Promise<CalendarDay[]> {
    return this.calendarDayRepository.getCalendarDaysByUserId(userId)
  }

  async getCalendarDayById(calendarId: number): Promise<CalendarDay | null> {
    return this.calendarDayRepository.getCalendarDayById(calendarId)
  }

  async getCalendarDayByUserIdAndDate(userId: string, date: string): Promise<CalendarDay | null> {
    return this.calendarDayRepository.getCalendarDayByUserIdAndDate(userId, date)
  }

  async updateCalendarDay(calendarId: number, updateData: UpdateCalendarDay): Promise<boolean> {
    return this.calendarDayRepository.updateCalendarDay(calendarId, updateData)
  }

  async getCalendarDayVideosByDateAndZipCode(
    date: string,
    zipcode: string,
  ): Promise<NearbyVideoData[] | null> {
    const zipcodeList = [zipcode] // Yeh function abhi bhi shayad kahin aur use ho raha ho, isko waise hi rakhte hain
    if (!zipcodeList || zipcodeList.length === 0) return []
    return this.calendarDayRepository.getCalendarDayVideosByDateAndZipCode(date, zipcodeList)
  }

  async deleteCalendarDay(calendarId: number): Promise<boolean> {
    return this.calendarDayRepository.deleteCalendarDay(calendarId)
  }
}

export default CalendarDayService
