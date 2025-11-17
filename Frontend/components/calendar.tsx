// File: components/calendar.tsx
// ✅ COMPLETE AND FINAL UPDATED FILE — Timezone-safe markings & header tweaks

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { format, startOfMonth, parse, isBefore, startOfToday, addMonths } from 'date-fns';
import { CalendarDay } from '../types/CalendarDay';
import { User as Auth0User } from 'react-native-auth0';
import { colors } from '../utils/theme';
import { UpcomingDate } from '../types/Date';

interface CustomMarking {
  customStyles?: {
    container?: object;
    text?: object;
  };
  dotColor?: string;
  marked?: boolean;
  disabled?: boolean;
  disableTouchEvent?: boolean;
}

interface MarkedDates {
  [date: string]: CustomMarking;
}

interface VideoCalendarProps {
  user: (Auth0User & { sub?: string }) | null;
  calendarData: CalendarDay[];
  plannedDates: UpcomingDate[];
}

// ---- TZ-SAFE HELPERS ----
const parseDateOnlyLocal = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const s = dateStr.substring(0, 10);
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  if (!y || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
};

const VideoCalendar: React.FC<VideoCalendarProps> = ({ user, calendarData, plannedDates }) => {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const today = startOfToday();
    const newMarkedDates: MarkedDates = {};

    // 1) Yellow dot for days with a posted invite (userVideoUrl)
    calendarData.forEach((entry) => {
      if (entry?.date && entry.userVideoUrl) {
        const dateStr = entry.date.substring(0, 10);
        newMarkedDates[dateStr] = {
          marked: true,
          dotColor: colors.GoldPrimary, // Posted invite
        };
      }
    });

    // 2) Override with Orange (pending) / Teal (approved) for planned dates
    plannedDates.forEach((pDate) => {
      if (!pDate?.date) return;
      const dateStr = pDate.date.substring(0, 10);
      if (pDate.status === 'pending') {
        newMarkedDates[dateStr] = { marked: true, dotColor: '#FFA500' };
      } else if (pDate.status === 'approved') {
        newMarkedDates[dateStr] = { marked: true, dotColor: '#40E0D0' };
      }
    });

    // 3) Disable past days in the visible month that have no markings
    const monthStartDate = startOfMonth(parse(currentMonth, 'yyyy-MM-dd', new Date()));
    for (let dayNum = 1; dayNum <= 31; dayNum++) {
      const day = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), dayNum);
      if (day.getMonth() !== monthStartDate.getMonth()) break;
      const dateStr = format(day, 'yyyy-MM-dd');

      if (isBefore(day, today) && !newMarkedDates[dateStr]) {
        newMarkedDates[dateStr] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            text: {
              color: '#707070',
              textDecorationLine: 'line-through',
            },
          },
        };
      }
    }

    setMarkedDates(newMarkedDates);
  }, [calendarData, plannedDates, currentMonth]);

  const handleDayPress = (day: DateData) => {
    if (markedDates[day.dateString]?.disabled) return;

    if (!user?.sub) {
      Alert.alert('Authentication Error', 'User information not available. Please try again.');
      return;
    }

    const dateInfo = markedDates[day.dateString];
    if (dateInfo?.marked) {
      // Marked day → go to stories (see availability)
      router.push({ pathname: '/(app)/stories', params: { date: day.dateString } });
    } else {
      // Empty available day → allow upload
      router.push({ pathname: '/(app)/upload-day-video', params: { date: day.dateString } });
    }
  };

  const today = startOfToday();
  const firstDayOfCurrentMonth = startOfMonth(today);
  const maxDateObj = addMonths(today, 6);
  const minDateStr = format(firstDayOfCurrentMonth, 'yyyy-MM-dd');
  const maxDateStr = format(maxDateObj, 'yyyy-MM-dd');

  return (
    <View style={styles.calendarWrapper}>
      <Calendar
        onMonthChange={(month) => setCurrentMonth(month.dateString)}
        onDayPress={handleDayPress}
        markingType="custom"
        markedDates={markedDates}
        style={styles.calendar}
        minDate={minDateStr}
        maxDate={maxDateStr}
        theme={{
          backgroundColor: colors.Background || '#1E1E1E',
          calendarBackground: colors.Background || '#1E1E1E',
          textSectionTitleColor: colors.LightGrey || '#b6c1cd',
          selectedDayBackgroundColor: colors.GoldPrimary || '#FFDB5C',
          selectedDayTextColor: colors.Black || '#000000',
          todayTextColor: colors.White || '#FFFFFF',
          dayTextColor: colors.White || '#E0E0E0',
          dotColor: colors.GoldPrimary,
          selectedDotColor: colors.White || '#ffffff',
          arrowColor: colors.GoldPrimary || '#FFDB5C',
          disabledArrowColor: colors.GreyDark || '#555555',
          monthTextColor: colors.White || '#E0E0E0',
          indicatorColor: colors.GoldPrimary || '#FFDB5C',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13,
          // Header tweaks:
          'stylesheet.calendar.header': {
            week: {
              marginTop: 5,
              flexDirection: 'row',
              justifyContent: 'space-around',
              borderBottomWidth: 1,
              borderColor: colors.Grey || '#424242',
              paddingBottom: 5,
            },
            monthText: {
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.GoldPrimary || '#FFDB5C',
              margin: 10,
            },
          },
        }}
        enableSwipeMonths
        hideExtraDays
        firstDay={1}
      />

      {/* Legend with updated colors */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDotSquare, { backgroundColor: colors.GoldPrimary }]} />
          <Text style={styles.legendText}>Posted Invite</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDotSquare, { backgroundColor: '#FFA500' }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDotSquare, { backgroundColor: '#40E0D0' }]} />
          <Text style={styles.legendText}>Confirmed</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarWrapper: {
    width: '100%',
    backgroundColor: colors.Background || '#1F1F1F',
  },
  calendar: {
    borderRadius: 8,
    marginHorizontal: 5,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 20,
    paddingBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
  },
  legendDotSquare: {
    width: 15,
    height: 15,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    color: colors.LightGrey || '#E0E0E0',
    fontSize: 12,
  },
});

export default VideoCalendar;
