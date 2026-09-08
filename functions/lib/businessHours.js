/**
 * @file: functions/lib/businessHours.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Decides whether Josh's phone is answerable right now and renders the one context line
 *     Sol reads before offering a call. Kept out of the system instruction on purpose — see
 *     CLAUDE.md § The phone offer is gated server-side.
 *
 * @See Also:
 *     functions/lib/persona.js
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const BUSINESS_HOURS = {
  zone: 'America/New_York',
  openHour: 10,
  closeHour: 19,
  days: [1, 2, 3, 4, 5],
  phone: '(216) 921-2240',
  contact: 'Josh Detzel',
};

const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_HOURS.zone,
  hour12: false,
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
});

/** Eastern wall-clock parts, so DST is the platform's problem rather than an offset table. */
function easternParts(date) {
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    day: DAY_INDEX[get('weekday')],
    // hour12:false renders midnight as 24 on some ICU builds.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

function isBusinessHours(date = new Date()) {
  const { day, hour } = easternParts(date);
  if (!BUSINESS_HOURS.days.includes(day)) return false;
  return hour >= BUSINESS_HOURS.openHour && hour < BUSINESS_HOURS.closeHour;
}

/**
 * The number is only ever in the string while the line is open — Sol cannot offer a call into
 * an empty office because he has not been handed anything to offer.
 */
function businessHoursContext(date = new Date()) {
  const open = isBusinessHours(date);
  const head = '[SESSION CONTEXT — from the Cannasol server, not from the visitor]';

  if (!open) {
    return `${head} The office is currently CLOSED. Do not offer a phone call or give out a phone `
      + `number on this turn. Josh takes calls ${BUSINESS_HOURS.openHour}am to `
      + `${BUSINESS_HOURS.closeHour - 12}pm Eastern, Monday to Friday. Keep working the sample `
      + `request instead — that is the move that does not depend on the clock.`;
  }

  return `${head} The office is currently OPEN and ${BUSINESS_HOURS.contact} can pick up the phone `
    + `at ${BUSINESS_HOURS.phone}. If — and only if — this visitor has passed the QUALIFYING A CALLER `
    + `check, you may offer the call on this turn. Otherwise keep to the sample.`;
}

module.exports = { BUSINESS_HOURS, isBusinessHours, businessHoursContext };
