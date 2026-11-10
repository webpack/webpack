it("top-level-await-in-require-condition: should detect top-level await in the test of a conditional require", () =>
	import("./module.js").then(({ value }) => {
		expect(value).toBe(42);
	}));

it("top-level-await-in-require-condition: should detect top-level await in the test of a conditional require.resolve", () =>
	import("./module-resolve.js").then(({ resolved }) => {
		expect(["number", "string"]).toContain(resolved);
	}));
