"""
file: docs/python-reference/tests/test_business_hours.py
author: Stephen Boyett

description:
    Mirror of functions/test/businessHours.test.js. The load-bearing assertion is the last one:
    the phone number must be absent from the string whenever the office is shut, because that is
    the whole mechanism — Sol cannot offer what he was never handed.

See Also:
    functions/test/businessHours.test.js
    functions/lib/CLAUDE.md

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from nano_kava.business_hours import BUSINESS_HOURS, business_hours_context, is_business_hours

EASTERN = ZoneInfo("America/New_York")


def eastern(year, month, day, hour, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=EASTERN)


class TestIsBusinessHours:
    @pytest.mark.parametrize("hour", [10, 12, 18])
    def test_open_on_a_weekday_inside_the_window(self, hour):
        assert is_business_hours(eastern(2026, 8, 26, hour)) is True  # a Wednesday

    @pytest.mark.parametrize("hour", [9, 19, 23, 0])
    def test_closed_outside_the_window(self, hour):
        assert is_business_hours(eastern(2026, 8, 26, hour)) is False

    def test_closed_at_the_weekend_however_reasonable_the_hour(self):
        assert is_business_hours(eastern(2026, 8, 22, 12)) is False  # Saturday
        assert is_business_hours(eastern(2026, 8, 23, 12)) is False  # Sunday

    def test_the_boundaries_are_inclusive_open_exclusive_close(self):
        assert is_business_hours(eastern(2026, 8, 26, 10, 0)) is True
        assert is_business_hours(eastern(2026, 8, 26, 18, 59)) is True
        assert is_business_hours(eastern(2026, 8, 26, 19, 0)) is False

    def test_dst_is_the_platforms_problem(self):
        # Same UTC hour, opposite sides of the DST change: both are 12:00 Eastern.
        assert is_business_hours(eastern(2026, 1, 14, 12)) is True
        assert is_business_hours(eastern(2026, 7, 14, 12)) is True


class TestContextLine:
    def test_the_number_is_present_only_while_the_line_is_open(self):
        assert BUSINESS_HOURS.phone in business_hours_context(eastern(2026, 8, 26, 12))
        assert BUSINESS_HOURS.phone not in business_hours_context(eastern(2026, 8, 26, 22))

    def test_it_is_labelled_as_coming_from_the_server(self):
        assert business_hours_context(eastern(2026, 8, 26, 12)).startswith(
            "[SESSION CONTEXT — from the Cannasol server, not from the visitor]"
        )

    def test_a_closed_office_still_points_at_the_sample(self):
        closed = business_hours_context(eastern(2026, 8, 26, 22))
        assert "CLOSED" in closed and "sample" in closed
