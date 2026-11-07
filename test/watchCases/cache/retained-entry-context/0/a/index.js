import value from "../value.js";

it("should resolve the retained entry in context a", () => {
	expect(WATCH_STEP).not.toBe("1");
	expect(value).toBe(WATCH_STEP);
	expect(__webpack_layer__).toBe(
		WATCH_STEP === "3" ? "first" : WATCH_STEP === "4" ? "second" : null
	);
});
