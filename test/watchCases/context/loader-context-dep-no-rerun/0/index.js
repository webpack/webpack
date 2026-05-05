import value from "./loader!";
import unrelated from "./unrelated";

it("only re-runs an addContextDependency loader when the context dir actually changes", () => {
	const step = +WATCH_STEP;
	expect(typeof value).toBe("number");
	expect(typeof unrelated).toBe("number");
	if (step === 0) {
		STATE.value = value;
	} else if (step === 1 || step === 2) {
		// Steps 1 and 2 only modify an unrelated sibling file. The loader's
		// context dependency `directory/` is unchanged, so the cached output
		// must be reused.
		expect(value).toBe(STATE.value);
	} else if (step === 3) {
		// Step 3 actually adds a new file inside `directory/`, which should
		// invalidate the loader and produce a fresh `Math.random()` value.
		expect(value).not.toBe(STATE.value);
		STATE.value = value;
	} else if (step === 4) {
		// And after a real change we again expect unrelated edits to leave
		// the loader alone.
		expect(value).toBe(STATE.value);
	}
});
