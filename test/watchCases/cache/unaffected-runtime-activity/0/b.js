STATE.effect = false;
require("./wrapper");
const effect = STATE.effect;

it("should update the connection in runtime b", () => {
	expect(effect).toBe(WATCH_STEP === "1" || WATCH_STEP === "2");
	expect(require("./stable")).toBe(42);
});
