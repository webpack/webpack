import { used } from "./barrel.js";

it("should keep the requested export and its ordinary import working", () => {
	expect(used()).toBe("used");
});

it("should only expand the ordinary imports of requested star exports when sideEffects is enabled", () => {
	const expected = [
		"index.js",
		"barrel.js",
		"used.js",
		"unused.js",
		"used-helper.js"
	];
	if (!BUILD_REPORT.sideEffects) expected.push("large-subtree.js", "deep.js");
	expect(BUILD_REPORT.modules).toEqual(expected.sort());
});
