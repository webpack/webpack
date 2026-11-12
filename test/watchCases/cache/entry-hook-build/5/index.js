import value from "./value";

it("should retry failed entry imports until they resolve", () => {
	if (WATCH_STEP === "5" || WATCH_STEP === "6") {
		expect(() => require("./missing")).toThrow();
	} else {
		expect(require("./missing")).toBe(WATCH_STEP === "8" ? 99 : 42);
	}
	expect(value).toBe(WATCH_STEP);
});
