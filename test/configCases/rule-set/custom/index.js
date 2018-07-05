it("should match a custom loader", function() {
	var a = require("./a");
	expect(a).toEqual([
		"a",
		{
			issuer: "index.js",
			resource: "a.js",
			resourceQuery: ""
		}
	]);
	var b = require("./b?hello");
	expect(b).toEqual([
		"b",
		{
			issuer: "index.js",
			resource: "b.js",
			resourceQuery: "?hello"
		}
	]);
	var ca = require("./call-a?hello");
	expect(ca).toEqual([
		"a",
		{
			issuer: "call-a.js",
			resource: "a.js",
			resourceQuery: "?hello"
		},
		{
			issuer: "index.js",
			resource: "call-a.js",
			resourceQuery: "?hello"
		}
	]);
});
