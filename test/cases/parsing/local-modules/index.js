it("should not create a context for typeof require", function() {
	define("my-module", function() {
		return 1234;
	});
	define(["my-module"], function(myModule) {
		myModule.should.be.eql(1234);
	});
});
