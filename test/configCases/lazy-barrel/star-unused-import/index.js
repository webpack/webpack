import { used } from "./barrel.js";

it("should build the ordinary imports of reexport requested after the barrel was built", () =>
	import("./later.js").then(({ unused }) => {
	expect(unused()).toBe("unused");
}));

it("should keep the requested export and its ordinary import working", () => {
	expect(used()).toBe("used");
});

it("should activate ordinary imports reached through nested star re-exports", () => {
	const expected = [
		"index.js",
		"barrel.js",
		"later.js",
		"later-1.js",
		"later-2.js",
		"used.js",
		"unused.js",
		"used-helper.js"
	];
	expected.push("large-subtree.js", "deep.js");
	expect(BUILD_REPORT.modules).toEqual(expected.sort());
});
