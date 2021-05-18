import a from "./a.generate-json.js";
import { value as unrelated } from "./unrelated";

it("should have to correct values and validate on change", () => {
	const step = +WATCH_STEP;
	expect(a.value).toBe(42);
	expect(a.a).toBe("a");
	expect(a.nested.value).toBe(step < 3 ? 42 : 24);
	expect(a.nested.a).toBe(step < 3 ? "a" : undefined);
	expect(a.b).toBe(step < 1 ? "b" : undefined);
	expect(a.nested.b).toBe(step < 1 ? "b" : undefined);
	expect(a.c).toBe(step < 1 ? undefined : "c");
	expect(a.nested.c).toBe(step < 1 || step >= 3 ? undefined : "c");
	if (step !== 0) {
		expect(STATE.random === a.random).toBe(step === 2);
	}
	STATE.random = a.random;
});
