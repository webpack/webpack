it("should load nested commons chunk", function(done) {
	var counter = 0;
	require.ensure(["./a"], function(require) {
		require("./a").should.be.eql("a");
		require.ensure(["./c", "./d"], function(require) {
			require("./c").should.be.eql("c");
			require("./d").should.be.eql("d");
			if(++counter == 4) done();
		});
		require.ensure(["./c", "./e"], function(require) {
			require("./c").should.be.eql("c");
			require("./e").should.be.eql("e");
			if(++counter == 4) done();
		});
	});
	require.ensure(["./b"], function(require) {
		require("./b").should.be.eql("b");
		require.ensure(["./c", "./d"], function(require) {
			require("./c").should.be.eql("c");
			require("./d").should.be.eql("d");
			if(++counter == 4) done();
		});
		require.ensure(["./c", "./e"], function(require) {
			require("./c").should.be.eql("c");
			require("./e").should.be.eql("e");
			if(++counter == 4) done();
		});
	});
});
