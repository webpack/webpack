it("should load nested commons chunk", function(done) {
	require.ensure(["./a"], function(require) {
		expect(require("./a")).toBe("a");
		var counter = 0;
		require.ensure(["./b", "./c"], function(require) {
			expect(require("./b")).toBe("b");
			expect(require("./c")).toBe("c");
			if(++counter == 3) done();
		});
		require.ensure(["./b", "./d"], function(require) {
			expect(require("./b")).toBe("b");
			expect(require("./d")).toBe("d");
			if(++counter == 3) done();
		});
		require.ensure(["./b"], function(require) {
			expect(require("./b")).toBe("b");
			if(++counter == 3) done();
		});
	});
});
