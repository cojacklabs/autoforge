---
id: component.virdua-sidebar
type: component
name: Virdua Sidebar
description: Persistent navigation rail for the Virdua dashboard.
relationships:
  screen:
    - screen.virdua-dashboard
  token:
    - token.virdua-color-primary
tags:
  - virdua
  - pilot
source: manual:virdua-pilot
updatedAt: 2026-08-20T15:55:44.754Z
design:
  kind: component
  variants:
    - expanded
    - collapsed
  properties:
    - name: active-item
      type: string
      required: true
      description: Currently selected navigation item.
  slots:
    - navigation-items
---

The sidebar remains visible on desktop and collapses to an icon rail at narrow widths.
