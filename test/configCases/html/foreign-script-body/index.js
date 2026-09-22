const fs = require("fs");
const path = require("path");

const page = require("./page.html");

// The HTML module type is opaque to static analysis, so the imported page is
// normalized to a concrete string once.
const pageContent = typeof page === "string" ? page : "";

it("should read a foreign script body as character data", () => {
	expect(pageContent).toMatchSnapshot();

	// The chunk is found by the `src` the page carries rather than by matching
	// the tag around it, which reads as an HTML filter and is never one.
	const match = /src="([^"]+\.js)"/.exec(pageContent);
	expect(match).not.toBe(null);
	const chunk = fs.readFileSync(path.resolve(__dirname, match[1]), "utf-8");
	// `<svg><script>` holds character data, so `&lt;` names the `<` the author
	// wrote. Kept as its source the body reads `1 & lt < 2`, which parses but
	// throws on an undefined `lt`.
	expect(chunk).toContain("1 < 2");
	expect(chunk).not.toContain("&lt;");
	expect(chunk).not.toMatch(/\blt\b/);
});
