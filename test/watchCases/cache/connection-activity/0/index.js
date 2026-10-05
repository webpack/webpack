import "./effect.js";

it("should update cached code when a connection changes activity", () => {
	expect(STATE.effect).toBe(WATCH_STEP === "1" ? "0" : WATCH_STEP);
});
