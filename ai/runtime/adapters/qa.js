// QA adapter: evaluate a TestPlan and return a stubbed summary.

export function evaluate(testPlan) {
  const cases = Array.isArray(testPlan?.cases) ? testPlan.cases : [];
  const results = cases.map((c) => ({ id: c.id, type: c.type, status: "pending" }));
  return {
    total: results.length,
    passed: 0,
    failed: 0,
    pending: results.length,
    results,
    notes: "Stub QA evaluation; integrate with project test runner in future milestone.",
  };
}

