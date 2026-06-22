// No import/export syntax: top-level await alone marks this as an ES module,
// matching Node.js module syntax detection.
let value = 0;

it("should treat a module with only top-level await as an ES module", () =>
	require.cache[module.id].exports.then(() => {
		expect(value).toBe(42);
	}));

await new Promise((r) => setTimeout(r, 100));

value = 42;
