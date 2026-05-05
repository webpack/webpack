import value from "./loader!";
import unrelated from "./unrelated";

it("re-runs an addContextDependency loader on add/delete inside the dir but not on unrelated edits", () => {
	const step = +WATCH_STEP;
	expect(typeof unrelated).toBe("number");
	if (step === 0) {
		expect(value.files).toEqual(["a.txt"]);
		STATE.random = value.random;
	} else if (step === 1) {
		// Step 1 adds a new file inside `directory/` — loader must re-run
		// and observe the new file.
		expect(value.files).toEqual(["a.txt", "b.txt"]);
		expect(value.random).not.toBe(STATE.random);
		STATE.random = value.random;
	} else if (step === 2) {
		// Step 2 only edits an unrelated sibling — loader must NOT re-run
		// (the bug from #16886 was a spurious re-run here).
		expect(value.files).toEqual(["a.txt", "b.txt"]);
		expect(value.random).toBe(STATE.random);
	} else if (step === 3) {
		// Step 3 deletes b.txt — loader must re-run.
		expect(value.files).toEqual(["a.txt"]);
		expect(value.random).not.toBe(STATE.random);
	}
});
