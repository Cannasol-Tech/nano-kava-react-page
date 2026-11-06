Feature: User flows
  Each scenario walks one path of _bmad-output/planning-artifacts/user-flows/user-flows.md end to
  end, carrying the requirement and story tags of every step it exercises.

  @UF_01 @FR_0101 @FR_0201 @FR_0202 @FR_0204 @FR_0205 @story_1_1 @story_2_1 @e2e @web
  Scenario: UF-01 A prospect requests a sample through Sol
    Given a visitor is on the landing page
    Then Sol's launcher is visible
    When the visitor opens Sol from the launcher
    Then Sol greets them by name with a question and no health claim
    When the visitor asks Sol a product question
    Then Sol's answer streams into the transcript
    When the visitor asks Sol for a sample, giving their name, company and email
    Then Sol shows a sample request card filled in from the conversation
    When the visitor adds a phone number and sends the card
    Then the card confirms it was sent

  @UF_01 @FR_0206 @story_2_1 @e2e @web
  Scenario: UF-01 A1 On a phone the prospect taps Sol's greeting bubble to open the chat
    Given a visitor on a phone-sized screen is on the landing page
    When the visitor waits past Sol's greeting and scrolls past the hero
    Then Sol has not opened itself
    And Sol offers a greeting bubble instead
    When the visitor taps the greeting bubble
    Then the chat opens

  @UF_01 @FR_0205 @story_2_1 @e2e @web
  Scenario: UF-01 A2 and E1 The card refuses to send without a contact method and sends with only a phone
    Given Sol has shown the visitor a sample request card
    When the visitor removes both the phone number and the email from the card
    Then the card cannot be sent
    When the visitor adds only a phone number and sends the card
    Then the card confirms it was sent

  @UF_01 @FR_0203 @story_2_1 @e2e @web
  Scenario: UF-01 E2 Sol declines personal dosing advice and keeps to product facts
    Given a visitor is chatting with Sol
    When the visitor asks Sol for personal dosing or health advice
    Then Sol declines and makes no claim about what kava does to a person

  @UF_02 @FR_0103 @FR_0302 @story_1_1 @story_3_1 @e2e @web
  Scenario: UF-02 A prospect follows the call to action and sends the contact form
    Given a visitor is on the landing page
    When the visitor follows the sample request call to action
    Then the visitor is on the contact page
    When the visitor submits a complete contact form
    Then the visitor sees a confirmation that Josh will follow up within 24 hours

  @UF_02 @FR_0301 @story_3_1 @e2e @web
  Scenario: UF-02 E1 The contact form names an invalid email and does not submit
    Given a visitor is on the contact page
    When the visitor fills in a name and an invalid email and submits
    Then the form names the Email field as invalid
    And nothing was submitted

  @UF_03 @FR_0204 @FR_0402 @FR_0404 @story_2_1 @story_4_1 @e2e @web
  Scenario: UF-03 The team reviews a Sol conversation from the lead's review link
    Given a prospect has sent a sample request through Sol
    When the reviewer opens the lead's review link
    Then the questionnaire shows four 1 to 5 scales, two checkboxes and one comment box
    When the reviewer scores the conversation and submits the review
    Then the reviewer sees the Saved page

  @UF_03 @FR_0403 @story_4_1 @e2e @web
  Scenario: UF-03 A1 A star tapped in the email opens the form preselected and unsaved
    Given a lead has been submitted through the contact form
    When the reviewer opens the review link from a 5 star tap
    Then the overall score shows 5 selected and says it is not saved yet

  @UF_03 @FR_0404 @story_4_1 @e2e @web
  Scenario: UF-03 A2 Reopening the review link later shows the saved answers
    Given a lead has been submitted through the contact form
    And the reviewer has already filed a review
    When the reviewer reopens the review link
    Then the saved answers are shown for editing
