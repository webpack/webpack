it("should match a path relative to the package root", function () {
	expect(require("fake-package/lib/button.js")).toBe("string");
});

it("should not match a nested path with the same tail", function () {
	expect(require("fake-package/vendor/lib/button.js")).toBe("regexp");
});

it("should match with a function condition", function () {
	expect(require("fake-package")).toBe("function");
});

it("should match with a negated condition", function () {
	expect(require("fake-package/src/dispatch.js")).toBe("not");
});

it("should be unset when a match resource is used", function () {
	expect(require("./virtual.js!=!fake-package/lib/button.js")).toBe("button");
});

it("should be relative to the package the module itself belongs to", function () {
	const self = require("./self.js");
	expect(self.startsWith("self ./")).toBe(true);
	expect(self.endsWith("/description-relative-path/self.js")).toBe(true);
});
