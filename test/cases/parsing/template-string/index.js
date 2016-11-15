var should = require('should')

it("should parse template strings in System.import", function(done) {
	var name = "abc".split("");
	Promise.all([
		System.import(`./abc/${name[0]}${name[1]}${name[2]}Test`),
		System.import(String.raw`./${name.join("")}/${name.join("")}Test`)
	])
	.then(function (imports) {
		for (var i = 0; i < imports.length; i++) {
			imports[i].default.should.eql("ok");
		}
	})
	.then(function () { done(); }, done)
});
