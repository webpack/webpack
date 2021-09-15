it("should parse template strings in import", function(done) {
	var name = "abc".split("");
	var suffix = "Test";
	Promise.all([
		import(`./abc/${name[0]}${name[1]}${name[2]}Test`),
		import(String.raw`./${name.join("")}/${name.join("")}Test`),
		import(String.raw`./abc/${name.join("")}${suffix}`)
	])
	.then(function (imports) {
		for (var i = 0; i < imports.length; i++) {
			expect(imports[i].default).toEqual("ok");
		}
	})
	.then(function () { done(); }, done)
});

it("should parse .concat strings in import", function(done) {
	var name = "abc".split("");
	var suffix = "Test";
	import("./abc/".concat(name[0]).concat(name[1]).concat(name[2], "Test"))
	.then(function (imported) {
		expect(imported.default).toEqual("ok");
	})
	.then(function () { done(); }, done)
});

require("./cjs")
require("./amd")
