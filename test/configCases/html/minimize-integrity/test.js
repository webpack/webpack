const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name));
const html = read("page.html").toString("utf-8");

it("minifies the emitted HTML", () => {
	// Quotes a value does not need are dropped, which is what puts the sentinel
	// through the unquoted path below.
	expect(html).toContain("<html lang=en>");
});

it("resolves an integrity sentinel that minification unquoted", () => {
	// Minification runs before the sentinel is resolved, so the late pass has to
	// match it without the quotes it was written with — otherwise the literal
	// survives into the emitted page and SRI silently never applies.
	expect(html).not.toContain("__WEBPACK_HTML_INTEGRITY__");
	expect(html).not.toContain("authorPlaceholder");

	// An SRI list carries spaces and `=` padding, so the replacement re-quotes.
	const match = html.match(/ integrity="(sha384-[^"]+)"/);
	expect(match).toBeTruthy();

	const src = html.match(/<script[^>]*\ssrc=([^\s>]+)/);
	expect(src).toBeTruthy();
	const digest = `sha384-${crypto.createHash("sha384").update(read(src[1])).digest("base64")}`;
	expect(match[1]).toBe(digest);
});
