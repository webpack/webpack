const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit page.html referencing both the bundled JS and CSS chunks", () => {
	const html = readFile("page.html");
	expect(html).toMatchSnapshot();
	// Original source references were rewritten away.
	expect(html).not.toContain('src="./app.js"');
	expect(html).not.toContain('href="./styles.css"');
	// `<script src>` points at an emitted JS chunk that exists on disk.
	const scriptMatch = html.match(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/);
	expect(scriptMatch).not.toBeNull();
	expect(scriptMatch[1]).toMatch(/\.js$/);
	expect(fs.existsSync(path.resolve(__dirname, scriptMatch[1]))).toBe(true);
	// `<link rel="stylesheet">` points at an emitted CSS chunk holding `.box`.
	const linkMatch = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/);
	expect(linkMatch).not.toBeNull();
	const hrefMatch = linkMatch[0].match(/href="([^"]+)"/);
	expect(hrefMatch).not.toBeNull();
	expect(hrefMatch[1]).toMatch(/\.css$/);
	expect(readFile(hrefMatch[1])).toContain(".box");
});
