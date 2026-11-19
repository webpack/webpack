it("should handle the coffee loader correctly", function() {
	expect(require("!coffee-loader!../_resources/script.coffee")).toBe("coffee test");
	expect(require("../_resources/script.coffee")).toBe("coffee test");
});

it("should handle literate coffee script correctly", function() {
	expect(require("!coffee-loader?literate=1!./script.coffee.md")).toBe("literate coffee test");
});

it("should generate valid code with cheap-source-map", function() {
	require("!coffee-loader!./module-only.coffee");
});

it("should require a coffee module from a base64 data URI", function () {
	const mod = require("coffee-loader!Data:application/node;charset=utf-8;base64,bW9kdWxlLmV4cG9ydHMgPQogIG51bWJlcjogNDIKICBmbjogKCkgLT4gIkhlbGxvIHdvcmxkIg==");
	expect(mod.number).toBe(42);
	expect(mod.fn()).toBe("Hello world");
});
