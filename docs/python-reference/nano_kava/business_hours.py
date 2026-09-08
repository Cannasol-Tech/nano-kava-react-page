"""
file: docs/python-reference/nano_kava/business_hours.py
author: Stephen Boyett

description:
    Python replica of functions/lib/businessHours.js. Decides whether Josh's phone is answerable
    right now and renders the one context line Sol reads before offering a call. JS reaches for
    Intl.DateTimeFormat so DST is the platform's problem; Python's equivalent is zoneinfo, and
    the two agree because both defer to the same IANA database.

See Also:
    functions/lib/businessHours.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class BusinessHoursConfig:
    zone: str = "America/New_York"
    open_hour: int = 10
    close_hour: int = 19
    days: tuple[int, ...] = (1, 2, 3, 4, 5)  # JS Date.getDay(): Sunday is 0.
    phone: str = "(216) 921-2240"
    contact: str = "Josh Detzel"


BUSINESS_HOURS = BusinessHoursConfig()

HEAD = "[SESSION CONTEXT — from the Cannasol server, not from the visitor]"


@dataclass(frozen=True)
class EasternParts:
    day: int
    hour: int
    minute: int


def eastern_parts(moment: datetime) -> EasternParts:
    """Eastern wall-clock parts, so DST is the platform's problem rather than an offset table."""
    local = moment.astimezone(ZoneInfo(BUSINESS_HOURS.zone))
    # Python weekday() is Mon=0..Sun=6; JS getDay() is Sun=0..Sat=6. isoweekday() is Mon=1..Sun=7,
    # so `% 7` lands Sunday on 0 and matches JS exactly.
    return EasternParts(day=local.isoweekday() % 7, hour=local.hour % 24, minute=local.minute)


def is_business_hours(moment: datetime | None = None) -> bool:
    moment = datetime.now(timezone.utc) if moment is None else moment
    parts = eastern_parts(moment)
    if parts.day not in BUSINESS_HOURS.days:
        return False
    return BUSINESS_HOURS.open_hour <= parts.hour < BUSINESS_HOURS.close_hour


def business_hours_context(moment: datetime | None = None) -> str:
    """
    The number is only ever in the string while the line is open — Sol cannot offer a call into
    an empty office because he has not been handed anything to offer.
    """
    if not is_business_hours(moment):
        return (
            f"{HEAD} The office is currently CLOSED. Do not offer a phone call or give out a phone "
            f"number on this turn. Josh takes calls {BUSINESS_HOURS.open_hour}am to "
            f"{BUSINESS_HOURS.close_hour - 12}pm Eastern, Monday to Friday. Keep working the sample "
            f"request instead — that is the move that does not depend on the clock."
        )

    return (
        f"{HEAD} The office is currently OPEN and {BUSINESS_HOURS.contact} can pick up the phone "
        f"at {BUSINESS_HOURS.phone}. If — and only if — this visitor has passed the QUALIFYING A CALLER "
        f"check, you may offer the call on this turn. Otherwise keep to the sample."
    )
