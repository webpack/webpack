it("should set correct options on js files", function() {
	expect(require("./loader!./index.js")).toEqual({
		minimize: true,
		jsfile: true
	});
});
it("should set correct options on other files", function() {
	expect(require("./loader!./txt.txt")).toEqual({
		minimize: true
	});
});
