const tick = require("./tick");
const childLayer = require("./child");

it("should update the entry layer and its inherited module layers", () => {
	const expected = WATCH_STEP === "0" ? "first" : WATCH_STEP === "1" ? "second" : null;
	expect(tick).toBe(Number(WATCH_STEP));
	expect(__webpack_layer__).toBe(expected);
	expect(childLayer).toBe(expected);
});
