import * as entry from "./entry";

it("should re-export the branch of a condition known at build time", () => {
	expect(entry.read()).toBe("target");
	const inner = __STATS__.modules
		.filter((m) => m.modules)
		.reduce((names, m) => names.concat(m.modules.map((module) => module.name)), []);
	expect(inner).toContain("./entry.js");
	expect(inner).toContain("./target.js");
});
