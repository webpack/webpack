it("should not treat await in a require.ensure callback as top-level await", () =>
	require("./ensure").result.then((value) => {
		expect(value).toBe(42);
	}));

it("should not treat await in an AMD require callback as top-level await", () =>
	require("./amd-require").result.then((value) => {
		expect(value).toBe(42);
	}));

it("should not treat await in an AMD define factory as top-level await", () =>
	require("./amd-define").then((value) => {
		expect(value).toBe(42);
	}));
