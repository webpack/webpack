import { used } from "./barrel.js";

it("should build the ordinary imports of reexport requested after the barrel was built", () =>
	import("./later.js").then(({ unused, mixedLocal }) => {
	expect(unused()).toBe("unused");
	expect(mixedLocal()).toBe("mixed");
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
		"used-helper.js",
		"mixed.js",
		"mixed-helper.js"
	];
	expected.push("large-subtree.js", "deep.js");
	if (!BUILD_REPORT.sideEffects) expected.push("reexported.js");
	expect(BUILD_REPORT.modules).toEqual(expected.sort());
});

it("should not build a re-export target for a local export's imports", () => {
	expect(BUILD_REPORT.modules.includes("reexported.js")).toBe(
		!BUILD_REPORT.sideEffects
	);
});
