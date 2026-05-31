import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDateTime(dateStr?: string, timeStr?: string, timestamp?: any): Date {
  if (dateStr && timeStr) {
    try {
      // dateStr: DD/MM/YYYY
      const dateParts = dateStr.split('/');
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts;
        
        // timeStr: HH:MM AM/PM
        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM|am|pm)?/);
        let hrs = 0;
        let mins = 0;
        
        if (timeMatch) {
          hrs = parseInt(timeMatch[1], 10);
          mins = parseInt(timeMatch[2], 10);
          const modifier = timeMatch[3]?.toUpperCase();
          
          if (hrs === 12) {
            hrs = 0;
          }
          if (modifier === 'PM') {
            hrs += 12;
          }
        }
        
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), hrs, mins, 0);
      }
    } catch (e) {
      console.error('Error parsing date/time', e);
    }
  }

  if (timestamp) {
    const parsed = formatTimestamp(timestamp);
    if (parsed) return parsed;
  }
  
  return new Date(0);
}

export function formatTimestamp(timestamp: any): Date | null {
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  return null;
}
