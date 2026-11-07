import value from "../value.js";

it("should resolve the retained entry with its current request", () => {
	expect(WATCH_STEP).toBe("6");
	expect(value).toBe("6");
});
