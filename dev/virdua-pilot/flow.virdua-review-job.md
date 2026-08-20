---
id: flow.virdua-review-job
type: flow
name: Virdua Review Job
description: Primary dashboard flow from queue to completed review.
relationships:
  entry:
    - screen.virdua-dashboard
  component:
    - component.virdua-job-card
tags:
  - virdua
  - pilot
  - flow
source: manual:virdua-pilot
updatedAt: "2026-08-20T12:00:00.000Z"
design:
  kind: flow
  steps:
    - id: dashboard
      screen: screen.virdua-dashboard
      action: Select a job card.
      next: review
    - id: review
      action: Complete the review action.
---

The pilot flow validates that the screen and card specifications connect to a user outcome.
