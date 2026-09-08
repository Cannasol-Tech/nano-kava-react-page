"""
file: docs/python-reference/nano_kava/jsisms.py
author: Stephen Boyett

description:
    The handful of JavaScript coercion rules the ported modules actually depend on, written out
    once so every replica can call them instead of quietly guessing. These are the places where
    an idiomatic Python translation would silently disagree with the JavaScript original, which
    makes them the most useful file here to read first.

See Also:
    docs/python-reference/README.md
    functions/lib/chatStore.js

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""

from __future__ import annotations

from typing import Any

UNDEFINED = ...  # Ellipsis stands in for JS `undefined`; None stands in for JS `null`.


def js_string(value: Any) -> str:
    """JS `String(value)`. Differs from Python `str()` on bools, None and floats."""
    if value is None:
        return "null"
    if value is UNDEFINED:
        return "undefined"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, float) and value.is_integer():
        return str(int(value))  # JS has no int/float split: String(3.0) is "3", not "3.0".
    return str(value)


def nullish(value: Any, fallback: Any) -> Any:
    """JS `value ?? fallback` — falls back ONLY for null/undefined, never for 0, '' or False."""
    return fallback if value is None or value is UNDEFINED else value


def falsy_or(value: Any, fallback: Any) -> Any:
    """JS `value || fallback` — falls back for every falsy value, 0 and '' included."""
    return value if is_truthy(value) else fallback


def is_truthy(value: Any) -> bool:
    """
    JS truthiness. Diverges from Python's on empty containers: `[]` and `{}` are truthy in JS
    and falsy in Python, which is the single easiest way to mistranslate a guard.
    """
    if value is None or value is UNDEFINED or value is False:
        return False
    if value is True:
        return True
    if isinstance(value, (int, float)):
        return value != 0 and value == value  # NaN != NaN, and NaN is falsy.
    if isinstance(value, str):
        return value != ""
    return True  # Every object, list and dict — empty or not.


def js_clip(value: Any, max_chars: int) -> str:
    """JS `String(value ?? '').slice(0, max)`."""
    return js_string(nullish(value, ""))[:max_chars]


def js_slice_tail(items: list, count: int) -> list:
    """JS `array.slice(-count)`. Python's `[-count:]` agrees except when count is 0."""
    if count == 0:
        return list(items)  # slice(-0) is slice(0) in JS: the WHOLE array, not an empty one.
    return list(items[-count:])
