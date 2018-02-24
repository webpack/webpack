it("should replace a async context with a manual map", function() {
	var a = "a";
	return import(a).then(function(a) {
		a.should.be.eql({ default: "b" });
	});
});
