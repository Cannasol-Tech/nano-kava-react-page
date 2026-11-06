"""
file: test/acceptance/steps/test_epic_1.py
author: Stephen Boyett

description:
    Steps for features/epic-1-site-pages.feature (F-001, Site pages & discoverability). Page and
    navigation steps drive APP_URL; the 404, no-JavaScript, head-tag, JSON-LD and sitemap steps
    read production with GETs only, because only real hosting shows them.

See Also:
    test/acceptance/features/epic-1-site-pages.feature
    test/acceptance/support/site.py

---
Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
---
"""
from __future__ import annotations

import re
import uuid

from playwright.sync_api import expect
from pytest_bdd import scenarios, then, when

from common import *  # noqa: F403 — shared steps register only when imported into the test module
from support.journey import Journey, PageVisit
from support.site import (
    HOME,
    ORGANIZATION_NAME,
    PUBLIC_PAGES,
    ServedHead,
    is_shown,
    main_heading,
    main_navigation,
    nav_link,
)

scenarios("epic-1-site-pages.feature")

OTHER_PAGES = tuple(p for p in PUBLIC_PAGES if not p.is_home)
_LOC = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>")


def _failures(visits: list[PageVisit], ok) -> list[str]:
    return [visit.path for visit in visits if not ok(visit)]


@when("the visitor opens each public page")
def open_each_page(journey: Journey) -> None:
    for public_page in PUBLIC_PAGES:
        journey.open_app(public_page.path)
        journey.visits.append(PageVisit(
            path=public_page.path,
            status=journey.response.status,
            heading_visible=is_shown(main_heading(journey.page, public_page)),
            navigation_visible=is_shown(main_navigation(journey.page)),
            copy_visible=True,
        ))


@then("each page shows its own heading")
def each_heading(journey: Journey) -> None:
    missing = _failures(journey.visits, lambda v: v.heading_visible)
    assert not missing, f"no page heading on: {missing}"


@then("each page shows the main navigation")
def each_navigation(journey: Journey) -> None:
    missing = _failures(journey.visits, lambda v: v.navigation_visible)
    assert not missing, f"no main navigation on: {missing}"


@then("the landing page's main navigation reaches every other public page")
def landing_nav_reaches_all(journey: Journey) -> None:
    for public_page in OTHER_PAGES:
        journey.open_app(HOME.path)
        nav_link(journey.page, public_page.nav_label).click()
        expect(journey.page).to_have_url(re.compile(rf"{re.escape(public_page.path)}$"))
        expect(main_heading(journey.page, public_page)).to_be_visible()


@then("every other page's main navigation leads back to the landing page")
def nav_leads_home(journey: Journey) -> None:
    for public_page in OTHER_PAGES:
        journey.open_app(public_page.path)
        nav_link(journey.page, public_page.home_link).click()
        expect(journey.page).to_have_url(re.compile(r"//[^/]+/$"))
        expect(main_heading(journey.page, HOME)).to_be_visible()


@when("a visitor requests an address that is not a page on the live site")
def request_missing_page(journey: Journey) -> None:
    journey.open_site(f"/no-such-page-{uuid.uuid4().hex[:8]}")


@then("the live site answers HTTP 404")
def answers_404(journey: Journey) -> None:
    assert journey.response.status == 404, f"expected 404, got {journey.response.status}"


@then("the visitor sees a not-found page rather than the home page")
def not_found_page(journey: Journey) -> None:
    expect(journey.page.get_by_text("Page not found")).to_be_visible()
    expect(main_heading(journey.page, HOME)).to_have_count(0)


@when("a crawler without JavaScript opens each public page on the live site")
def crawl_each_page(journey: Journey) -> None:
    for public_page in PUBLIC_PAGES:
        page = journey.open_site(public_page.path, crawler=True)
        journey.visits.append(PageVisit(
            path=public_page.path,
            status=journey.response.status,
            heading_visible=main_heading(page, public_page).is_visible(),
            navigation_visible=main_navigation(page).is_visible(),
            copy_visible=page.get_by_text(public_page.readable_copy).first.is_visible(),
            head=ServedHead.read(page),
        ))


@then("each page's heading and copy are readable without JavaScript")
def readable_without_js(journey: Journey) -> None:
    unreadable = _failures(journey.visits, lambda v: v.status == 200 and v.heading_visible and v.copy_visible)
    assert not unreadable, f"not readable with JavaScript disabled: {unreadable}"


@then("each page has exactly one title, one meta description and one canonical URL")
def one_of_each(journey: Journey) -> None:
    wrong = [
        f"{v.path}: {v.head.titles} title, {v.head.descriptions} description, {len(v.head.canonicals)} canonical"
        for v in journey.visits
        if (v.head.titles, v.head.descriptions, len(v.head.canonicals)) != (1, 1, 1)
    ]
    assert not wrong, "head tags are not one of each:\n" + "\n".join(wrong)


@then("each canonical URL is that page's own address")
def canonical_is_self(journey: Journey) -> None:
    expected = {p.path: p.canonical_url for p in PUBLIC_PAGES}
    wrong = [f"{v.path} → {v.head.canonicals}" for v in journey.visits if v.head.canonicals != (expected[v.path],)]
    assert not wrong, f"canonical URL does not name the page itself: {wrong}"


@then("each page's JSON-LD names Cannasol Technologies as the organization")
def json_ld_names_organization(journey: Journey) -> None:
    missing = _failures(journey.visits, lambda v: v.head.names_organization(ORGANIZATION_NAME))
    assert not missing, f"no JSON-LD Organization named {ORGANIZATION_NAME!r} on: {missing}"


@when("a crawler fetches the live sitemap.xml")
def fetch_sitemap(journey: Journey) -> None:
    journey.open_site("/sitemap.xml")


@then("the sitemap lists every public page")
def sitemap_lists_pages(journey: Journey) -> None:
    assert journey.response.status == 200, f"sitemap.xml answered {journey.response.status}"
    listed = set(_LOC.findall(journey.response.text()))
    missing = [p.canonical_url for p in PUBLIC_PAGES if p.canonical_url not in listed]
    assert not missing, f"sitemap.xml does not list: {missing} (it lists {sorted(listed)})"


@when("a crawler fetches the live llms.txt")
def fetch_llms(journey: Journey) -> None:
    journey.open_site("/llms.txt")


@then("it is served as Markdown")
def served_as_markdown(journey: Journey) -> None:
    response = journey.response
    content_type = response.headers.get("content-type", "")
    assert response.status == 200, f"llms.txt answered {response.status}"
    assert content_type.startswith("text/markdown"), f"llms.txt is served as {content_type!r}"
    assert response.text().lstrip().startswith("# "), "llms.txt does not open with a Markdown heading"
