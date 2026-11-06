@feature_F_001
Feature: Site pages & discoverability
  A visiting beverage brand can reach every page, and so can the crawlers that decide whether the
  site is found at all. Interactive scenarios drive APP_URL; what only real hosting can show —
  status codes, prerendered HTML, head tags, sitemap — is read from SITE_URL with GETs only.

  @FR_0101 @story_1_1 @e2e @web
  Scenario: Each public page shows its own heading and the main navigation
    When the visitor opens each public page
    Then each page shows its own heading
    And each page shows the main navigation

  @FR_0102 @story_1_1 @e2e @web
  Scenario: The main navigation reaches every public page
    Given a visitor is on the landing page
    Then the landing page's main navigation reaches every other public page
    And every other page's main navigation leads back to the landing page

  @FR_0103 @story_1_1 @e2e @web
  Scenario: The landing page's sample request call to action leads to the contact page
    Given a visitor is on the landing page
    When the visitor follows the sample request call to action
    Then the visitor is on the contact page

  @FR_0104 @story_1_1 @e2e @web
  Scenario: An address that is not a page returns a real 404
    When a visitor requests an address that is not a page on the live site
    Then the live site answers HTTP 404
    And the visitor sees a not-found page rather than the home page

  @FR_0105 @story_1_1 @e2e @web
  Scenario: Every public page is readable on the live site with JavaScript disabled
    When a crawler without JavaScript opens each public page on the live site
    Then each page's heading and copy are readable without JavaScript

  @FR_0106 @story_1_1 @e2e @web
  Scenario: Every public page ships exactly one title, one description and one canonical URL
    When a crawler without JavaScript opens each public page on the live site
    Then each page has exactly one title, one meta description and one canonical URL
    And each canonical URL is that page's own address

  @FR_0107 @story_1_1 @e2e @web
  Scenario: Every public page identifies Cannasol Technologies in its structured data
    When a crawler without JavaScript opens each public page on the live site
    Then each page's JSON-LD names Cannasol Technologies as the organization

  @FR_0108 @story_1_1 @e2e @web
  Scenario: The sitemap lists every public page and llms.txt is served as Markdown
    When a crawler fetches the live sitemap.xml
    Then the sitemap lists every public page
    When a crawler fetches the live llms.txt
    Then it is served as Markdown
