it("should maintain require context", function() {
	var context = {foo: "bar"};
	(function(){
		require(["./a", "./b"], function(a, b) {
			this.foo.should.eql("bar");
		}.bind(this));
	}).call(context);
});