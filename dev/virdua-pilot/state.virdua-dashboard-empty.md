---
id: state.virdua-dashboard-empty
type: state
name: Virdua Dashboard Empty
description: Empty review queue state for the dashboard.
relationships:
  subject:
    - screen.virdua-dashboard
tags:
  - virdua
  - pilot
  - state
source: manual:virdua-pilot
updatedAt: "2026-08-20T12:00:00.000Z"
design:
  kind: state
  subject: screen.virdua-dashboard
  name: empty
  conditions:
    - No review jobs are available.
  changes:
    - Show the empty queue message.
    - Keep navigation available.
---

The empty state gives the reviewer a clear next action without hiding dashboard navigation.
