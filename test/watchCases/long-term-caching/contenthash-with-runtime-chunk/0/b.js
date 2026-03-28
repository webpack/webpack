import { sharedValue } from "./large-shared";
it("should have the shared value in b", () => {
	const expected =
		WATCH_STEP === "0" ? "__SHARED__" : "__SHARED_CHANGED__";
	expect(sharedValue).toBe(expected);
});
