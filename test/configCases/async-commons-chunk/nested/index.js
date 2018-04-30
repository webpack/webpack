it("should load nested commons chunk", function(done) {
	require.ensure(["./a"], function(require) {
		require("./a").should.be.eql("a");
		var counter = 0;
		require.ensure(["./b", "./c"], function(require) {
			require("./b").should.be.eql("b");
			require("./c").should.be.eql("c");
			if(++counter == 3) done();
		});
		require.ensure(["./b", "./d"], function(require) {
			require("./b").should.be.eql("b");
			require("./d").should.be.eql("d");
			if(++counter == 3) done();
		});
		require.ensure(["./b"], function(require) {
			require("./b").should.be.eql("b");
			if(++counter == 3) done();
		});
	});
});
