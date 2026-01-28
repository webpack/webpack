import * as namespace from "../destructuring-namespace-import/module";

it("should work with destructuring", function() {
	const key = "fo" + "o";
	const { ...rest } = namespace;

	expect(rest[key]).toBe("bar");
});
