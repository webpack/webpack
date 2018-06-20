it("should load the full async commons", function(done) {
	require.ensure(["./a"], function(require) {
		expect(require("./a")).toBe("a");
		done();
	});
});

it("should load a chunk with async commons (AMD)", function(done) {
	require(["./a", "./b"], function(a, b) {
		expect(a).toBe("a");
		expect(b).toBe("b");
		done();
	});
});

it("should load a chunk with async commons (require.ensure)", function(done) {
	require.ensure([], function(require) {
		expect(require("./a")).toBe("a");
		expect(require("./c")).toBe("c");
		done();
	});
});
