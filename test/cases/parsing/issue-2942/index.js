it("should polyfill System", function() {
	if (typeof System === "object" && typeof System.register === "function") {
		require("fail");
	}
	(typeof System).should.be.eql("object");
	(typeof System.register).should.be.eql("undefined");
	(typeof System.get).should.be.eql("undefined");
	(typeof System.set).should.be.eql("undefined");
	(typeof System.anyNewItem).should.be.eql("undefined");
	var x = System.anyNewItem;
	(typeof x).should.be.eql("undefined");
})