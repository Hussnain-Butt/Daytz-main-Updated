// File: src/services/external/ZipcodeService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import zipcodes from 'zipcodes'

const MAX_DISTANCE_MILES = 200

class ZipcodeService {
  constructor() {
    console.log("[ZipcodeService] Ready to use 'zipcodes' functions.")
  }

  /**
   * ✅ NAYA FUNCTION: Zipcode se latitude aur longitude fetch karta hai.
   * @param zipcode The zipcode to look up.
   * @returns An object with latitude and longitude, or null if not found.
   */
  async getCoordsForZip(zipcode: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const data = zipcodes.lookup(zipcode)
      if (data && data.latitude && data.longitude) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
        }
      }
      return null
    } catch (error) {
      console.error(`[ZipcodeService] Coordinate lookup error for ${zipcode}:`, error)
      return null
    }
  }

  // Yeh function ab stories ke liye use nahi hoga, lekin ho sakta hai kahin aur use ho raha ho,
  // isliye isko rakha hai.
  async findNearbyZipcodes(sourceZipcode: string): Promise<string[]> {
    try {
      const nearbyZipsRaw = zipcodes.radius(sourceZipcode, MAX_DISTANCE_MILES) || []
      const nearbyZips: string[] = nearbyZipsRaw.map((z: any) =>
        typeof z === 'string' ? z : z.zip,
      )

      if (!nearbyZips.includes(sourceZipcode)) {
        nearbyZips.push(sourceZipcode)
      }

      return nearbyZips
    } catch (error) {
      console.error(`[ZipcodeService] Error finding nearby zipcodes for ${sourceZipcode}:`, error)
      return [sourceZipcode]
    }
  }
}

export default ZipcodeService
