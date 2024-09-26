import a, { value, random } from "./mod.js";
import { value as unrelated } from "./unrelated";

it("should have to correct values and validate on change", () => {
	const step = +WATCH_STEP;
	expect(a).toBe(24);
	expect(value).toBe(42);
	expect(random).toBeDefined();

	if (step !== 0) {
		expect(STATE.random === a.random).toBe(step === 1);
	}
	STATE.random = a.random;
});
