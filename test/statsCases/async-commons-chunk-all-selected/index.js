it("should load the full async commons", function(done) {
	require.ensure(["./a"], function(require) {
		require("./a").should.be.eql("a");
		done();
	});
});

it("should load a chunk with async commons (AMD)", function(done) {
	require(["./a", "./b"], function(a, b) {
		a.should.be.eql("a");
		b.should.be.eql("b");
		done();
	});
});

it("should load a chunk with async commons (require.ensure)", function(done) {
	require.ensure([], function(require) {
		require("./a").should.be.eql("a");
		require("./c").should.be.eql("c");
		done();
	});
});
