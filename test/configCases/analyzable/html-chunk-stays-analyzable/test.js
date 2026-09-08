const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
const html = read("page.html");

it("should point the page at javascript this build emitted", () => {
	const script = /<script[^>]*src="([^"]+)"[^>]*><\/script>/.exec(html);

	expect(script).not.toBe(null);
	expect(fs.existsSync(path.resolve(__dirname, script[1]))).toBe(true);
});

it("should point the page at a stylesheet this build emitted", () => {
	const link = /<link rel="stylesheet" href="([^"]+)">/.exec(html);

	expect(link).not.toBe(null);
	expect(fs.existsSync(path.resolve(__dirname, link[1]))).toBe(true);
});

it("should reach the chunk an html page's javascript imports by name", () => {
	const script = /<script[^>]*src="([^"]+)"[^>]*><\/script>/.exec(html);
	const entry = read(script[1]);
	const ensureChunkCall = `${"__webpack_require__"}.e(`;

	expect(entry).toContain('"./lazy-page.mjs"');
	expect(entry).not.toContain(ensureChunkCall);
	expect(fs.existsSync(path.resolve(__dirname, "lazy-page.mjs"))).toBe(true);
});
