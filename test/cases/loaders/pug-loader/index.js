it("should handle the pug loader correctly", function() {
	expect(require("!@webdiscus/pug-loader?self=true!../_resources/template.pug")({ abc: "abc" })).toBe("<p>selfabc</p><h1>included</h1>");
	expect(require("../_resources/template.pug")({ abc: "abc" })).toBe("<p>abc</p><h1>included</h1>");
});

it("should return a function from @webdiscus/pug-loader", function() {
	const render = require("!@webdiscus/pug-loader!../_resources/template.pug");
	expect(typeof render).toBe("function");
	expect(render({ abc: "test" })).toBe("<p>test</p><h1>included</h1>");
});
