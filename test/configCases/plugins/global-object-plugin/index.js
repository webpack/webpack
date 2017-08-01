it("should provide 'window' as 'this' of IIFE", function() {
  var await = false;

	(function() {
		this.foo.should.be.eql("bar");
	}());
});
