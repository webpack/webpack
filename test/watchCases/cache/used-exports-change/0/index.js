import { used, betaUsed } from "./consumer";

// An export nothing imports is flagged unused, and the provider reads that back
// from its own exports info, so its codegen depends on a consumer it never names.
it("should drop and restore an export as its only consumer stops using it", () => {
	const step = Number(WATCH_STEP);
	expect(used).toBe(step === 1 ? "alpha-value|beta-value" : "alpha-value");
	expect(betaUsed).toBe(step === 1);
});
