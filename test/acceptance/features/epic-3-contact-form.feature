@feature_F_003
Feature: Contact form
  The form's production POST is forwarded to the dev server's DRY RUN handler, which runs the same
  validateLead as the deployed function and emails nobody. See test/acceptance/CLAUDE.md.

  @FR_0301 @story_3_1 @e2e @web
  Scenario: The contact form refuses a submission without a name or a valid email and names the field
    Given a visitor is on the contact page
    When the visitor submits the contact form empty
    Then the form names the Name and Email fields as needing attention
    And nothing was submitted
    When the visitor fills in a name and an invalid email and submits
    Then the form names the Email field as invalid
    And nothing was submitted

  # @wip product bug: Message is marked optional, so the form posts and the backend 400s with a generic toast.
  @FR_0301 @story_3_1 @e2e @web @wip
  Scenario: The contact form refuses a submission without a message and names the message field
    Given a visitor is on the contact page
    When the visitor submits the contact form with everything but a message
    Then the form names the Message field as needing attention
    And nothing was submitted

  @FR_0302 @story_3_1 @e2e @web
  Scenario: A complete contact form submission is confirmed with the follow-up named
    Given a visitor is on the contact page
    When the visitor submits a complete contact form
    Then the visitor sees a confirmation that Josh will follow up within 24 hours
