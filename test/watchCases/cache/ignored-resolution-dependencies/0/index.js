import value from "./consumer";
import tick from "./tick";

it("should watch and reevaluate ignored resolutions", () => {
	expect(value).toBe(WATCH_STEP === "2" || WATCH_STEP === "4" ? "enabled" : "ignored");
	expect(tick).toBe(WATCH_STEP === "0" ? 0 : 1);
});
