const value = require("./a-value");

it("should apply plugins once to the MultiCompiler and fire its hooks", () => {
	expect(value).toBe(`a${WATCH_STEP}`);
	expect(STATE.applied).toBe(1);
	expect(STATE.thisIsCompiler).toBe(true);
	expect(STATE.optionsPlugins).toBe(true);
	// Step 0 builds both children, step 1 only `a`, whose file changed.
	const expected =
		WATCH_STEP === "0"
			? ["watchRun a", "watchRun b", "done 2 a,b"]
			: ["watchRun a", "done 2 a"];
	expect(EVENTS.slice(0, -1).sort()).toEqual(expected.slice(0, -1));
	expect(EVENTS[EVENTS.length - 1]).toBe(expected[expected.length - 1]);
	EVENTS.length = 0;
});
