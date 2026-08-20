---
id: screen.virdua-dashboard
type: screen
name: Virdua Dashboard
description: Primary Virdua review dashboard pilot screen.
relationships:
  regions:
    - component.virdua-sidebar
    - component.virdua-job-card
  states:
    - state.virdua-dashboard-empty
  flow:
    - flow.virdua-review-job
tags:
  - virdua
  - pilot
  - dashboard
source: manual:virdua-pilot
updatedAt: 2026-08-20T15:55:46.621Z
design:
  kind: screen
  route: /dashboard
  regions:
    - sidebar
    - job-list
  entryState: state.virdua-dashboard-empty
---

The dashboard presents the navigation rail, review queue, and the primary job review action.
