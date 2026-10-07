it("should require json via require", function() {
	expect({ data: require("./a.json") }).toEqual({ data: null });
	expect({ data: require("./b.json") }).toEqual({ data: 123 });
	expect({ data: require("./c.json") }).toEqual({ data: [1, 2, 3, 4] });
	expect({ data: require("./e.json") }).toEqual({ data: {
		"aa": 1,
		"bb": 2,
		"1": "x"
	} });
});
