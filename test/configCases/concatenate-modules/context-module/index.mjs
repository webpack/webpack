/** @type {import('fs')} */
const fs = __non_webpack_require__("fs");

it("should import", async () => {
	const n = "a.js";
	const { default: a1 } = await import(`./sub/${n}`);
	expect(a1).toBe("a");
});

it("should startsWith use strict", async () => {
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source.length).not.toBe(0);
	expect(source.startsWith('/******/ "use strict"')).toBeTruthy();
});

it("should have all strict modules", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source.length).not.toBe(0);

	expect(source).not.toContain(
		[
			"This",
			"entry",
			"needs",
			"to",
			"be",
			"wrapped",
			"in",
			"an",
			"IIFE",
			"because",
			"it",
			"needs",
			"to",
			"be",
			"in",
			"strict",
			"mode."
		].join(" ")
	);
});
