import { sharedValue } from "./large-shared";

it("should compile without errors", () => {
	expect(STATS_JSON.errors).toHaveLength(0);
});

it("should have the shared value", () => {
	const expected =
		WATCH_STEP === "0" ? "__SHARED__" : "__SHARED_CHANGED__";
	expect(sharedValue).toBe(expected);
});
