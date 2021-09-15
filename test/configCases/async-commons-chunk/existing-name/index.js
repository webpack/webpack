const chunkLoadingSpy = jest.spyOn(__webpack_require__, "e");

it("should not have duplicate chunks in blocks", function (done) {
	let i = 0;
	const d = () => {
		if (i++ >= 3) done();
	};

	// This split point should contain: a
	require.ensure(
		[],
		function (require) {
			expect(require("./a")).toBe("a");
			d();
		},
		"a"
	);

	// This split point should contain: a and b - we use CommonsChunksPlugin to
	// have it only contain b and make chunk a be an async dependency.
	require.ensure(
		[],
		function (require) {
			expect(require("./a")).toBe("a");
			expect(require("./b")).toBe("b");
			d();
		},
		"a+b"
	);

	// This split point should contain: a, b and c - we use CommonsChunksPlugin to
	// have it only contain c and make chunks a and a+b be async dependencies.
	require.ensure(
		[],
		function (require) {
			expect(require("./a")).toBe("a");
			expect(require("./b")).toBe("b");
			expect(require("./c")).toBe("c");
			d();
		},
		"a+b+c"
	);

	// Each of the require.ensures above should end up resolving chunks:
	// - a
	// - a, a+b
	// - a, a+b, a+b+c
	expect(chunkLoadingSpy.mock.calls.length).toBe(6);
	expect(chunkLoadingSpy.mock.calls).toEqual([
		["a"],
		["a"],
		["a+b" /* == b */],
		["a"],
		["a+b" /* == b */],
		["a+b+c" /* == c */]
	]);
	d();
});
