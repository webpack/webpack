const fs = __non_webpack_require__("fs");

it("should create URL to asset even when user has javascript/auto rule", () => {
	const url = new URL("./source.js", import.meta.url);
	expect(url.href).not.toContain("[object%20Module]");
	expect(url.href).not.toContain("[object%20Object]");
	expect(url.pathname).toMatch(/\.js$/);
	expect(fs.existsSync(url)).toBe(true);
});
