import { test } from "./file";

it("should allow import in array destructuring", function () {
	var other;
	[other = test] = [];
	expect(other).toBe("test");
});

it("should allow import in object destructuring", function () {
	var other;
	({ other = test } = {});
	expect(other).toBe("test");
});
