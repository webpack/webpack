import value from "./loader!";
import unrelated from "./unrelated";

it("only re-runs an addDependency loader when the tracked file actually changes", () => {
	const step = +WATCH_STEP;
	expect(typeof value).toBe("number");
	expect(typeof unrelated).toBe("number");
	if (step === 0) {
		STATE.value = value;
	} else if (step === 1) {
		// Step 1 modifies an unrelated sibling. The tracked.txt file is
		// unchanged so the loader's cached output must be reused.
		expect(value).toBe(STATE.value);
	} else if (step === 2) {
		// Step 2 modifies tracked.txt itself, which must invalidate the
		// loader and produce a fresh `Math.random()` value.
		expect(value).not.toBe(STATE.value);
	}
});
