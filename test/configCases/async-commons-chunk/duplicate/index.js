it("should load nested commons chunk", function(done) {
	var counter = 0;
	require.ensure(["./a"], function(require) {
		expect(require("./a")).toBe("a");
		require.ensure(["./c", "./d"], function(require) {
			expect(require("./c")).toBe("c");
			expect(require("./d")).toBe("d");
			if(++counter == 4) done();
		});
		require.ensure(["./c", "./e"], function(require) {
			expect(require("./c")).toBe("c");
			expect(require("./e")).toBe("e");
			if(++counter == 4) done();
		});
	});
	require.ensure(["./b"], function(require) {
		expect(require("./b")).toBe("b");
		require.ensure(["./c", "./d"], function(require) {
			expect(require("./c")).toBe("c");
			expect(require("./d")).toBe("d");
			if(++counter == 4) done();
		});
		require.ensure(["./c", "./e"], function(require) {
			expect(require("./c")).toBe("c");
			expect(require("./e")).toBe("e");
			if(++counter == 4) done();
		});
	});
});
