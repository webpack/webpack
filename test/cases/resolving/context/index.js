it("should resolve loaders relative to require", function() {
	var index = "index", test = "test";
	expect(require("./loaders/queryloader?query!!!!./node_modules/subcontent/" + index + ".js")).toEqual({
		resourceQuery: "",
		query: "?query",
		prev: "module.exports = \"error\";"
	});
	expect(require("!./loaders/queryloader?query!./node_modules/subcontent/" + test + ".pug")).toEqual({
		resourceQuery: "",
		query: "?query",
		prev: "xyz: abc"
	});
});
