const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const pageContent = typeof page === "string" ? page : "";

const tags = pageContent.match(/<script\b[^>]*><\/script[^>]*>/gi) || [];

const readTag = (tag) =>
	fs.readFileSync(
		path.resolve(__dirname, /src="([^"]+)"/.exec(tag)[1]),
		"utf-8"
	);

it("should keep a nomodule script out of the classic run", () => {
	// Each tag keeps its own chunk, in source order.
	expect(tags).toHaveLength(3);
	expect(tags[1]).toMatch(/\bnomodule\b/);
	expect(tags[0]).not.toMatch(/\bnomodule\b/);
	expect(tags[2]).not.toMatch(/\bnomodule\b/);
	const [a, b, c] = tags.map(readTag);
	expect(a).toContain("MARK_A");
	expect(a).not.toContain("MARK_B");
	expect(b).toContain("MARK_B");
	expect(b).not.toContain("MARK_C");
	expect(c).toContain("MARK_C");
});
