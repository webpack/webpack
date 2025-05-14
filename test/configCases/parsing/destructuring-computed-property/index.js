import * as namespace from "../destructuring-namespace-import/module";

it("should work with destructuring", function() {
	const key = "fo" + "o";
	const { [key]: a = 'foo', bar = "foo" } = namespace;

	expect(a).toBe("bar");
	expect(bar).toBe("foo");
});
