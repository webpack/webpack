import a from "./a.generate-json.js";
import { value as unrelated } from "./unrelated";

it("should have to correct values and validate on change", () => {
	const step = +WATCH_STEP;
	expect(a.value).toBe(42);
	expect(a.a).toBe("a");
	expect(a.nested.value).toBe(42);
	expect(a.nested.a).toBe("a");
	expect(a.b).toBe("b");
	expect(a.nested.b).toBe("b");
	if (step !== 0) {
		expect(STATE.random === a.random).toBe(step === 1);
	}
	STATE.random = a.random;
});
