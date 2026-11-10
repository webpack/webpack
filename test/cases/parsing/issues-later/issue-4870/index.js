import { test } from "./file";

it("issue-4870: should allow import in array destructuring", function () {
	var other;
	[other = test] = [];
	expect(other).toBe("test");
});

it("issue-4870: should allow import in object destructuring", function () {
	var other;
	({ other = test } = {});
	expect(other).toBe("test");
});
