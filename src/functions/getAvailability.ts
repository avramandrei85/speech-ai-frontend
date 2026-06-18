// 1. Define simplified types matching your direct flat structure
export type BusySlot = {
  start: string;
  end: string;
};

export type FreeWindow = {
  free_from: string;
  free_until: string;
};

export type DailyAvailability = {
  day: string;
  timezone: string;
  windows: FreeWindow[];
};

/**
 * Calculates continuous free slots within daily working hours by analyzing a flat array of busy intervals.
 */
export function getAvailableHours(
  busySlots: BusySlot[],
  workStartHour: number = 9,
  workEndHour: number = 16,
  timezone: string = "Europe/Bucharest",
): DailyAvailability[] {
  if (!busySlots || busySlots.length === 0) return [];

  // 2. Dynamically extract the global schedule range from your data
  const timestamps = busySlots.flatMap((slot) => [
    new Date(slot.start).getTime(),
    new Date(slot.end).getTime(),
  ]);
  const globalStart = new Date(Math.min(...timestamps));
  const globalEnd = new Date(Math.max(...timestamps));

  const result: DailyAvailability[] = [];

  // Iterator pointer initialization
  let currentDayPointer = new Date(globalStart);
  currentDayPointer.setUTCHours(0, 0, 0, 0);

  const endDateBoundary = new Date(globalEnd);
  endDateBoundary.setUTCHours(23, 59, 59, 999);

  // 3. Loop day-by-day through the entire window range
  while (currentDayPointer <= endDateBoundary) {
    const dayString = currentDayPointer.toISOString().split("T")[0];

    const dayWorkStart = new Date(
      `${dayString}T${String(workStartHour).padStart(2, "0")}:00:00Z`,
    );
    const dayWorkEnd = new Date(
      `${dayString}T${String(workEndHour).padStart(2, "0")}:00:00Z`,
    );

    if (dayWorkEnd < globalStart || dayWorkStart > globalEnd) {
      currentDayPointer.setUTCDate(currentDayPointer.getUTCDate() + 1);
      continue;
    }

    const effectiveStart =
      globalStart > dayWorkStart ? globalStart : dayWorkStart;
    const effectiveEnd = globalEnd < dayWorkEnd ? globalEnd : dayWorkEnd;

    if (effectiveStart >= effectiveEnd) {
      currentDayPointer.setUTCDate(currentDayPointer.getUTCDate() + 1);
      continue;
    }

    // 4. Filter and slice busy slots matching this specific day boundary
    const dayBusySlots: { start: Date; end: Date }[] = [];
    for (const slot of busySlots) {
      const bStart = new Date(slot.start);
      const bEnd = new Date(slot.end);

      if (bEnd > effectiveStart && bStart < effectiveEnd) {
        dayBusySlots.push({
          start: bStart < effectiveStart ? effectiveStart : bStart,
          end: bEnd > effectiveEnd ? effectiveEnd : bEnd,
        });
      }
    }

    dayBusySlots.sort((a, b) => a.start.getTime() - b.start.getTime());

    const windows: FreeWindow[] = [];
    let currentFreePointer = effectiveStart;

    for (const slot of dayBusySlots) {
      if (slot.start > currentFreePointer) {
        windows.push({
          free_from: currentFreePointer.toISOString().replace(/\.\d{3}/, ""),
          free_until: slot.start.toISOString().replace(/\.\d{3}/, ""),
        });
      }
      if (slot.end > currentFreePointer) {
        currentFreePointer = slot.end;
      }
    }

    if (currentFreePointer < effectiveEnd) {
      windows.push({
        free_from: currentFreePointer.toISOString().replace(/\.\d{3}/, ""),
        free_until: effectiveEnd.toISOString().replace(/\.\d{3}/, ""),
      });
    }

    if (windows.length > 0) {
      result.push({
        day: dayString,
        timezone: timezone,
        windows: windows,
      });
    }

    currentDayPointer.setUTCDate(currentDayPointer.getUTCDate() + 1);
  }

  return result;
}
