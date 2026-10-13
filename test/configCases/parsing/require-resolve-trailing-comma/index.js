it("should resolve a literal with a trailing comma", () => {
	const id = require.resolve("./dir/a.js",);
	expect(id).toBe(require.resolve("./dir/a.js"));
});

it("should weakly resolve a literal with a trailing comma", () => {
	const id = require.resolveWeak("./dir/a.js",);
	expect(id).toBe(require.resolve("./dir/a.js"));
});

it("should resolve a conditional argument with a trailing comma", () => {
	for (const useA of [true, false]) {
		const id = require.resolve(useA ? "./dir/a.js" : "./dir/b.js",);
		const weakId = require.resolveWeak(useA ? "./dir/a.js" : "./dir/b.js",);
		const expected = useA
			? require.resolve("./dir/a.js")
			: require.resolve("./dir/b.js");
		expect(id).toBe(expected);
		expect(weakId).toBe(expected);
	}
});

it("should resolve a context argument with a trailing comma", () => {
	for (const name of ["a", "b"]) {
		const id = require.resolve("./dir/" + name + ".js",);
		const weakId = require.resolveWeak("./dir/" + name + ".js",);
		const expected = name === "a"
			? require.resolve("./dir/a.js")
			: require.resolve("./dir/b.js");
		expect(id).toBe(expected);
		expect(weakId).toBe(expected);
	}
});

it("should handle parentheses and comments around the argument", () => {
	const id = require.resolve(("./dir/a.js" /* inner, ) */) /* before, ) */, /* after, ) */);
	const weakId = require.resolveWeak(("./dir/a.js"), // after, )
	);
	expect(id).toBe(require.resolve("./dir/a.js"));
	expect(weakId).toBe(require.resolve("./dir/a.js"));
});
