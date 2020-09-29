import value from "./loader!./loader";

it("should resolve to the correct file", () => {
	expect(value).toBe(`${WATCH_STEP};`);
});
