import * as namespace from "./barrel";

it("should recompute ambiguous exports after a source changes", () => {
	expect(Object.assign({}, namespace)).toEqual(
		WATCH_STEP === "1" ? { value: 1 } : {}
	);
});
