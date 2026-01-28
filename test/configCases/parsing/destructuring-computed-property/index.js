import * as namespace from "../destructuring-namespace-import/module";

it("should work with destructuring", function() {
	const key = "fo" + "o";
	const {
		[key]: a = "foo",
		["fo" + "o"]: a1 = "foo",
		[PROPERTY]: a2 = "foo",
		["unkn" + "own"]: unknown = "foo",
		unknown1 = "foo",
	} = namespace;

	expect(a).toBe("bar");
	expect(a1).toBe("bar");
	expect(a2).toBe("bar");
	expect(unknown).toBe("foo");
	expect(unknown1).toBe("foo");
});
