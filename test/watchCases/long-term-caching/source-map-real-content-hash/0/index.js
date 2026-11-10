import check from "./check";

const step = "first";

it("should point the source map at the emitted file", () => {
	expect(step).toBe("first");
	const name = check();
	// Step 2 restores this file, so the hashes must come back too.
	if (STATE.first) expect(name).toBe(STATE.first);
	else STATE.first = name;
});
