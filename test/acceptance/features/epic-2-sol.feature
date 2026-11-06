@feature_F_002
Feature: Sol, the sales concierge
  Sol is a live model behind the dev server's /api/chat. Replies are judged structurally: a reply
  arrived and streamed, the card appeared and was filled in, and no efficacy claim was made.

  @FR_0201 @story_2_1 @e2e @web
  Scenario: A visitor opens Sol from the launcher and is greeted by name
    Given a visitor is on the landing page
    When the visitor opens Sol from the launcher
    Then Sol greets them by name with a question and no health claim

  @FR_0202 @story_2_1 @e2e @web
  Scenario: Sol answers a product question with a reply that streams into the transcript
    Given a visitor is chatting with Sol
    When the visitor asks Sol a product question
    Then Sol's answer streams into the transcript

  @FR_0203 @story_2_1 @e2e @web
  Scenario: Sol declines personal dosing and health advice
    Given a visitor is chatting with Sol
    When the visitor asks Sol for personal dosing or health advice
    Then Sol declines and makes no claim about what kava does to a person

  @FR_0204 @story_2_1 @e2e @web
  Scenario: Asking for a sample shows an editable card filled in from the conversation
    Given a visitor is chatting with Sol
    When the visitor asks Sol for a sample, giving their name, company and email
    Then Sol shows a sample request card filled in from the conversation
    And every field on the card can be edited

  @FR_0205 @story_2_1 @e2e @web
  Scenario: The sample request card cannot be sent without a phone number or an email
    Given Sol has shown the visitor a sample request card
    When the visitor removes both the phone number and the email from the card
    Then the card cannot be sent
    When the visitor adds only a phone number
    Then the card can be sent

  @FR_0206 @story_2_1 @e2e @web
  Scenario: On a phone-sized screen Sol never opens itself
    Given a visitor on a phone-sized screen is on the landing page
    When the visitor waits past Sol's greeting and scrolls down the page
    Then Sol has not opened itself
    When the visitor taps Sol's launcher
    Then the chat opens
