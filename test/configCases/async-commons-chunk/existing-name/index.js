const sinon = require("sinon");
const chunkLoadingSpy = sinon.spy(__webpack_require__, "e");

it("should not have duplicate chunks in blocks", function(done) {
    // This split point should contain: a
	require.ensure([], function(require) {
		expect(require("./a")).toBe("a");
	}, "a");

    // This split point should contain: a and b - we use CommonsChunksPlugin to
    // have it only contain b and make chunk a be an async dependency.
	require.ensure([], function(require) {
		expect(require("./a")).toBe("a");
		expect(require("./b")).toBe("b");
	}, "a+b");

    // This split point should contain: a, b and c - we use CommonsChunksPlugin to
    // have it only contain c and make chunks a and a+b be async dependencies.
	require.ensure([], function(require) {
		expect(require("./a")).toBe("a");
		expect(require("./b")).toBe("b");
		expect(require("./c")).toBe("c");
	}, "a+b+c");

    // Each of the require.ensures above should end up resolving chunks:
    // - a
    // - a, a+b
    // - a, a+b, a+b+c
	expect(chunkLoadingSpy.callCount).toBe(6);
	expect(chunkLoadingSpy.args).toEqual([["a"], ["a"], ["a+b~a+b+c" /* == b */], ["a"], ["a+b~a+b+c" /* == b */], ["a+b+c"]]);
	done();
});
