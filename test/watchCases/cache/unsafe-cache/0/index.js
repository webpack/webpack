import value from "./changing-module";

it("should compile and cleanup correctly", () => {
	expect(value).toBe(WATCH_STEP);
});
