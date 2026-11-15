import value from "../value.js";

it("should resolve the retained entry in context a", () => {
	expect(WATCH_STEP).not.toBe("1");
	expect(value).toBe(WATCH_STEP);
});
