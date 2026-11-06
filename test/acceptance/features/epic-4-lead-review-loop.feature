@feature_F_004
Feature: Lead hand-off & Sol review loop
  Locally the dev server sweeps a lead at once and prints its review link, and /sol-review runs
  against an in-memory store. The 20-minute quiet period exists only on the deployed functions.

  @FR_0401 @story_4_1 @service
  Scenario: One person's chat card and contact form reach the sales team as one lead email
    Given the deployed functions and real email are available
    When one person sends a Sol sample card and a contact form to the deployed functions
    Then the sales team receives one lead email carrying every conversation after the quiet period

  @FR_0402 @story_4_1 @e2e @web
  Scenario: The lead email's review link opens the questionnaire
    Given a lead has been submitted through the contact form
    When the reviewer opens the lead's review link
    Then the questionnaire shows four 1 to 5 scales, two checkboxes and one comment box

  @FR_0403 @story_4_1 @e2e @web
  Scenario: A star tapped in the email only preselects the overall score
    Given a lead has been submitted through the contact form
    When the reviewer opens the review link from a 4 star tap
    Then the overall score shows 4 selected and says it is not saved yet
    When the reviewer reopens the review link
    Then no score has been saved

  @FR_0404 @story_4_1 @e2e @web
  Scenario: A submitted review is confirmed as Saved and reopens for editing
    Given a lead has been submitted through the contact form
    When the reviewer opens the lead's review link
    And the reviewer scores the conversation and submits the review
    Then the reviewer sees the Saved page
    When the reviewer reopens the review link
    Then the saved answers are shown for editing
    When the reviewer changes the overall score to 2 and submits again
    Then reopening the review link shows an overall score of 2
