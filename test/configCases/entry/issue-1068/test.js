var order = global.order;
delete global.order;
it("should run the modules in the correct order", function() {
	expect(order).toEqual([
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
