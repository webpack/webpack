import valueA from "./loader-a!";
import valueB from "./loader-b!";
import unrelated from "./unrelated";

it("isolates re-runs to the loader whose context dir actually changed", () => {
	const step = +WATCH_STEP;
	expect(typeof valueA).toBe("number");
	expect(typeof valueB).toBe("number");
	expect(typeof unrelated).toBe("number");
	if (step === 0) {
		STATE.a = valueA;
		STATE.b = valueB;
	} else if (step === 1) {
		// Step 1 only adds a file inside dir-a — loader-a re-runs, loader-b
		// stays cached.
		expect(valueA).not.toBe(STATE.a);
		expect(valueB).toBe(STATE.b);
		STATE.a = valueA;
	} else if (step === 2) {
		// Step 2 only adds a file inside dir-b — loader-b re-runs, loader-a
		// stays cached.
		expect(valueA).toBe(STATE.a);
		expect(valueB).not.toBe(STATE.b);
		STATE.b = valueB;
	} else if (step === 3) {
		// Step 3 only edits an unrelated sibling — neither loader re-runs.
		expect(valueA).toBe(STATE.a);
		expect(valueB).toBe(STATE.b);
	}
});
