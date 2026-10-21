/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PressureLevel, TimeOfDayState } from './types';

export const DEFAULT_TIME_OF_DAY: TimeOfDayState = {
  simulatedHour: 7.75, // 07:45 AM (Start of Morning Rush Hour)
  timeString: '07:45 AM',
  periodName: 'Morning Commute Surge',
  trafficMultiplier: 1.85,
  pressureLevel: 'Rush Hour Peak',
  isRushHour: true,
  isNight: false,
  sunIntensity: 0.65,
  ambientColor: 'rgba(30, 41, 59, 1)',
  mode: 'cycle',
  cycleSpeedMinutesPerSec: 6.0, // 6 simulated minutes per 1 real second (a full 24h day takes 4 minutes)
  surgeActive: false,
  surgeRemainingSec: 0,
};

/**
 * 24-Hour Traffic Demand Profile based on real-world municipal transportation curves (FHWA / HCM):
 * - Base overnight flow: 0.35x
 * - Morning Peak (07:15 - 09:30): up to 2.4x
 * - Midday Commercial Flow (11:00 - 14:00): ~1.15x
 * - Evening Outbound Peak (16:30 - 19:15): up to 2.6x
 * - Night Wind-down: 0.6x
 */
export function calculateTimeOfDayState(
  hour: number,
  surgeActive = false,
  surgeRemainingSec = 0,
  mode: 'cycle' | 'manual' = 'cycle',
  cycleSpeed = 6.0
): TimeOfDayState {
  // Normalize hour to [0, 24)
  let normalizedHour = hour % 24;
  if (normalizedHour < 0) normalizedHour += 24;

  // Gaussian Peak 1: Morning Commute (Center: 8.25 AM, Width: ~1.2 hr)
  const morningExp = Math.exp(-Math.pow(normalizedHour - 8.25, 2) / (2 * Math.pow(1.15, 2)));
  const morningContribution = 2.05 * morningExp;

  // Gaussian Peak 2: Evening Rush (Center: 17.5 PM, Width: ~1.3 hr)
  const eveningExp = Math.exp(-Math.pow(normalizedHour - 17.5, 2) / (2 * Math.pow(1.25, 2)));
  const eveningContribution = 2.25 * eveningExp;

  // Midday plateau (Center: 12.5 PM)
  const middayExp = Math.exp(-Math.pow(normalizedHour - 12.5, 2) / (2 * Math.pow(2.2, 2)));
  const middayContribution = 0.75 * middayExp;

  // Base overnight baseline
  const baseRate = 0.35;

  let multiplier = baseRate + morningContribution + eveningContribution + middayContribution;

  // Determine period label & rush hour flag
  let periodName = 'Late Night Sparse';
  let isRushHour = false;
  let pressure: PressureLevel = 'Low';

  if (normalizedHour >= 5.5 && normalizedHour < 7.0) {
    periodName = 'Dawn Early Commute';
    pressure = 'Moderate';
  } else if (normalizedHour >= 7.0 && normalizedHour < 9.5) {
    periodName = 'Morning Rush Hour';
    isRushHour = true;
    pressure = multiplier > 2.0 ? 'Rush Hour Peak' : 'Elevated';
  } else if (normalizedHour >= 9.5 && normalizedHour < 11.5) {
    periodName = 'Mid-Morning Transition';
    pressure = 'Moderate';
  } else if (normalizedHour >= 11.5 && normalizedHour < 14.5) {
    periodName = 'Midday Business Flow';
    pressure = 'Moderate';
  } else if (normalizedHour >= 14.5 && normalizedHour < 16.5) {
    periodName = 'Afternoon Build-Up';
    pressure = 'Elevated';
  } else if (normalizedHour >= 16.5 && normalizedHour < 19.5) {
    periodName = 'Evening Rush Hour';
    isRushHour = true;
    pressure = multiplier > 2.0 ? 'Rush Hour Peak' : 'Elevated';
  } else if (normalizedHour >= 19.5 && normalizedHour < 22.5) {
    periodName = 'Evening Flow';
    pressure = 'Moderate';
  } else {
    periodName = 'Late Night Sparse';
    pressure = 'Low';
  }

  // Apply Stress Surge if active
  if (surgeActive) {
    multiplier *= 1.85;
    pressure = 'Extreme Gridlock';
    periodName = `${periodName} (🔥 2x Stress Surge)`;
    isRushHour = true;
  }

  // Cap multiplier reasonably
  multiplier = Math.max(0.25, Math.min(4.5, Number(multiplier.toFixed(2))));

  // Format 12-hour AM/PM string
  const totalMinutes = Math.floor(normalizedHour * 60);
  const rawH = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = rawH >= 12 ? 'PM' : 'AM';
  const displayH = rawH % 12 === 0 ? 12 : rawH % 12;
  const timeString = `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;

  // Lighting & Sun Intensity
  // Sunrise ~ 6 AM (hour 6), Solar Noon ~ 12 PM (hour 12), Sunset ~ 19 PM (hour 19)
  const isNight = normalizedHour < 5.75 || normalizedHour >= 20.0;
  let sunIntensity = 0;
  let ambientColor = 'rgba(11, 19, 32, 1)'; // Deep night

  if (normalizedHour >= 6.0 && normalizedHour <= 18.0) {
    // Daytime curve
    sunIntensity = Math.sin(((normalizedHour - 6.0) / 12.0) * Math.PI);
    ambientColor = 'rgba(30, 41, 59, 1)'; // Neutral slate asphalt
  } else if (normalizedHour > 18.0 && normalizedHour < 20.0) {
    // Dusk golden hour
    const duskProgress = (normalizedHour - 18.0) / 2.0;
    sunIntensity = (1 - duskProgress) * 0.4;
    ambientColor = 'rgba(45, 25, 20, 1)'; // Warm twilight amber
  } else if (normalizedHour >= 5.0 && normalizedHour < 6.0) {
    // Dawn blue hour
    const dawnProgress = (normalizedHour - 5.0);
    sunIntensity = dawnProgress * 0.4;
    ambientColor = 'rgba(20, 30, 50, 1)'; // Cool morning cyan/blue
  }

  return {
    simulatedHour: Number(normalizedHour.toFixed(3)),
    timeString,
    periodName,
    trafficMultiplier: multiplier,
    pressureLevel: pressure,
    isRushHour,
    isNight,
    sunIntensity: Number(sunIntensity.toFixed(2)),
    ambientColor,
    mode,
    cycleSpeedMinutesPerSec: cycleSpeed,
    surgeActive,
    surgeRemainingSec: Math.max(0, surgeRemainingSec),
  };
}
