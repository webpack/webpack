import { test } from "./file";

it("should allow import in array destructing", function() {
	var other;
	[other = test] = [];
	expect(other).toBe("test");
});

it("should allow import in object destructing", function() {
	var other;
	({other = test} = {});
	expect(other).toBe("test");
});
