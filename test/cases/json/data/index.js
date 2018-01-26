it("should require json via require", function() {
	({ data: require("./a.json") }expect()).toEqual({ data: null });
	({ data: require("./b.json") }expect()).toEqual({ data: 123 });
	({ data: require("./c.json") }expect()).toEqual({ data: [1, 2, 3, 4] });
	({ data: require("./e.json") }expect()).toEqual({ data: {
		"aa": 1,
		"bb": 2,
		"1": "x"
	} });
});
