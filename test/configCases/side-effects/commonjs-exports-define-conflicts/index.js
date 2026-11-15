const bundled = (name) => `./${name}.js` in __webpack_modules__;

/**
 * @param {() => void} load requires the module
 * @returns {string | undefined} the name of the error evaluating it threw
 */
const evaluate = (load) => {
	try {
		load();
	} catch (err) {
		return err.name;
	}
};

it("should keep a module whose definitions make a later write or definition throw", () => {
	expect(evaluate(() => {
		require("./readonly-write");
	})).toBe("TypeError");
	expect(evaluate(() => {
		require("./write-in-loop");
	})).toBe("TypeError");
	expect(evaluate(() => {
		require("./redefine");
	})).toBe("TypeError");
	expect(evaluate(() => {
		require("./value-and-accessor");
	})).toBe("TypeError");
	const kept = [
		"readonly-write",
		"write-in-loop",
		"redefine",
		"value-and-accessor"
	];
	expect(kept.filter((name) => !bundled(name))).toEqual([]);
});

it("should drop a module whose definitions allow the later write or definition", () => {
	require("./writable-write");
	require("./configurable-redefine");
	require("./write-then-define");
	const dropped = ["writable-write", "configurable-redefine", "write-then-define"];
	expect(dropped.filter(bundled)).toEqual([]);
});
