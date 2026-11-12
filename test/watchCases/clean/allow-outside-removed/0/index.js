import value from "./changing-module";

it("should compile", () => {
	expect(value).toBe(Number(WATCH_STEP));
});
