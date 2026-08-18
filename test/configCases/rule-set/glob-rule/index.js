it("should match a rule-level glob list", function () {
	expect(require("./files/a")).toEqual(["a", "?glob"]);
	expect(require("./files/nested/d")).toEqual(["d", "?glob"]);
});

it("should combine the rule-level glob with test, include and exclude", function () {
	expect(require("./files/b.test")).toEqual(["b", "?combined"]);
	expect(require("./files/vendor/c")).toEqual(["c", "?vendor"]);
});

it("should exclude what a negated pattern matches", function () {
	expect(require("./files/vendor/skip")).toEqual(["skip"]);
});
