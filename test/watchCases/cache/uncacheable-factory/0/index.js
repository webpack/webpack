import value from "./barrel";
import tick from "./tick";

it("refreshes factories that reject caching", () => {
	expect(value).toBe(WATCH_STEP === "0" ? "a" : "b");
	if (Number(WATCH_STEP) % 2 === 0) {
		expect(() => require("optional")).toThrow("Cannot find module");
	} else {
		expect(require("optional")).toBe("a");
	}
	expect(tick).toBe(Number(WATCH_STEP));
});
