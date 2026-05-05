import value from "./loader!";
import unrelated from "./unrelated";

it("should not re-run a loader using addContextDependency on unrelated changes", () => {
	const step = +WATCH_STEP;
	expect(typeof value).toBe("number");
	expect(typeof unrelated).toBe("number");
	if (step === 0) {
		STATE.value = value;
	} else {
		// Loader should not have re-run because nothing inside `directory/` changed.
		expect(value).toBe(STATE.value);
	}
});
