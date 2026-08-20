---
id: component.virdua-job-card
type: component
name: Virdua Job Card
description: Review queue card showing one candidate job.
relationships:
  screen:
    - screen.virdua-dashboard
  state:
    - state.virdua-dashboard-empty
tags:
  - virdua
  - pilot
  - review
source: manual:virdua-pilot
updatedAt: "2026-08-20T12:00:00.000Z"
design:
  kind: component
  variants:
    - ready
    - selected
  properties:
    - name: title
      type: string
      required: true
    - name: status
      type: string
      required: true
  slots:
    - metadata
    - actions
---

Each card prioritizes the job title, status, and a single obvious review action.
