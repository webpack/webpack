import value from "./loader!";
import unrelated from "./unrelated";

it("invalidates an addMissingDependency loader only when the missing path appears", () => {
	const step = +WATCH_STEP;
	expect(typeof unrelated).toBe("number");
	if (step === 0) {
		// Initially the missing path doesn't exist.
		expect(value.exists).toBe(false);
		STATE.random = value.random;
	} else if (step === 1) {
		// Step 1 only edits an unrelated sibling — the loader must NOT
		// re-run; missing-existence stays `false`.
		expect(value.exists).toBe(false);
		expect(value.random).toBe(STATE.random);
	} else if (step === 2) {
		// Step 2 creates `future.json` — the loader must re-run and now
		// observe the file.
		expect(value.exists).toBe(true);
		expect(value.random).not.toBe(STATE.random);
		STATE.random = value.random;
	} else if (step === 3) {
		// Step 3 again only edits an unrelated sibling — loader cached.
		expect(value.exists).toBe(true);
		expect(value.random).toBe(STATE.random);
	}
});
