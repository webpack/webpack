it("should maintain require context", function() {
	var context = {foo: "bar"};
	require(["./a", "./b"], function(a, b) {
		this.foo.should.eql("bar");
	}.bind(context));
});