it("should maintain require context", function(done) {
	var context = {foo: "bar"};
	(function(){
		require(["./a", "./b"], function(a, b) {
			this.foo.should.eql("bar");
			done();
		}.bind(this));
	}).call(context);
	// Call require again so that CommonsChunkPlugin will create separate chunks for a and b
	require(["./a"], function(a) {});
});