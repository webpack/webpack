import value from "../value.js";

it("should resolve the retained entry in context b", () => {
	expect(WATCH_STEP).toBe("1");
	expect(value).toBe(WATCH_STEP);
});
