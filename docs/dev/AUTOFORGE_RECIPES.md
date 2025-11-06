# AutoForge Recipes – Ready-Made Blueprints

Recipes are **YAML templates** that the Meta Bootstrap Agent can instantiate instantly.  
Add new ones under `.autoforge/recipes/`.

---

## `gis_investment.yaml`

```yaml
recipe_name: GIS Real-Estate Investment Tracker
platforms: [web, mobile]
tech_stack:
  frontend: React + Tailwind + Shadcn UI
  mobile: React Native (Expo) or Flutter (auto-detect)
  backend: Node.js + Express + Prisma (Postgres)
  ai_tenant: OpenAI / Claude (function-calling)
  external_apis:
    - Regrid (parcels, zoning)
    - Rentcast (rental comps)
    - BLS / Census (demographics)
stages:
  - identify:
      description: Search parcels by budget, flood-risk, yield
      figma: layers/map_search.json
      code:
        - src/client/pages/Identify.tsx
        - src/server/routes/identify.ts
  - analyze:
      description: Cash-flow, ROI, risk scoring
      code:
        - src/server/services/scoringEngine.ts
  - legalize:
      description: Attorney CRM integration, e-sign
      code:
        - src/server/routes/legal.ts
  - deploy:
      description: Docker + CI (GitHub Actions)
      files:
        - Dockerfile
        - .github/workflows/ci.yml
ip_watermark: "{{client_id}} – proprietary"
```

## `mobile_auth.yaml`

```yaml
recipe_name: Secure Mobile Auth Flow
platforms: [mobile]
tech_stack:
  frontend: React Native + Expo
  backend: Supabase Auth (or Firebase)
stages:
  - onboarding:
      figma: layers/onboarding.json
      code: src/mobile/screens/Onboarding.tsx
  - biometric:
      code: src/mobile/services/biometric.ts
  - otp:
      code: src/server/routes/otp.ts
```

# How to Add a New Recipe

1. Create recipes/<name>.yaml with the structure above.
2. Run npx autoforge configure → updates ai/code_targets.yaml.
3. Prompt the Meta Agent: Use recipe gis_investment for client ABC.

---

**Copy each block into its own `.md` file** and you’re ready to hand them off to any AI model.  
They now have the full vision, the universal bootstrap prompt, and reusable recipe starters.

Let the agents take over!
