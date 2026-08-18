it("should match a relative glob at any depth", function () {
	expect(require("./files/a")).toEqual(["a", "?rest"]);
	expect(require("./files/nested/b")).toEqual(["b", "?rest"]);
});

it("should match a more specific glob first in a oneOf block", function () {
	expect(require("./files/nested/deep/c")).toEqual(["c", "?deep"]);
	expect(require("./files/vendor/d")).toEqual(["d", "?vendor"]);
});

it("should match an absolute glob built with path.resolve", function () {
	expect(require("./absolute/e")).toEqual(["e", "?absolute"]);
});
