const context = require.context("./mods", false, /\.js$/);

// The context module's list of requests is built at compile time, so a cached
// one keeps whatever the directory held on the build that produced it.
it("should track files added to and removed from a cached context", () => {
	const step = Number(WATCH_STEP);
	const expected =
		step === 0
			? ["./a.js", "./b.js"]
			: step === 1
				? ["./a.js", "./b.js", "./c.js"]
				: ["./a.js", "./c.js"];
	expect(context.keys().sort()).toEqual(expected);
	for (const key of expected) {
		expect(context(key).default).toBe(key.slice(2, -3));
	}
});
