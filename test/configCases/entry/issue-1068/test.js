it("should run the modules in the correct order", function() {
	global.order.should.be.eql([
		"a",
		"b",
		"c",
		"d",
		"e",
		"f",
		"g",
		"h",
		"i",
		"j",
		"k"
	]);
});
