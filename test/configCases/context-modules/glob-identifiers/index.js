const context = require.context("./dir", true, /a|b/);
const named = import.meta.glob("./named/*.js", {
	eager: true,
	import: "foo-bar"
});
const caseInsensitive = import.meta.glob("./upper/*.JS", {
	eager: true,
	caseSensitive: false
});

const moduleMatching = (substring) =>
	__STATS__.modules.find((m) => m.identifier.includes(substring));

it("should escape the regexp in the context module identifier", () => {
	expect(context.keys().sort()).toEqual(["./a", "./a.js", "./b", "./b.js"]);
	expect(moduleMatching("|sync|/a%7Cb/")).toBeDefined();
});

it("should use bracket access for a non-identifier export name", () => {
	expect(named["./named/one.js"]).toBe("one");
	expect(moduleMatching("|import: foo-bar")).toBeDefined();
});

it("should keep the user request for a glob entry without a module", () => {
	expect(named["./named/two.js"]).toBe(undefined);
});

it("should mark a case-insensitive glob in every identifier form", () => {
	expect(caseInsensitive["./upper/One.js"].default).toBe("upper");
	const module = moduleMatching("upper|sync");
	expect(module.identifier).toContain("case-insensitive");
	expect(module.name).toContain("case-insensitive");
	expect(module.id).toContain("case-insensitive");
});
