const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit a <link rel=stylesheet> for the entry chunk's CSS file", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();

	// The entry chunk emits both the JS chunk and a sibling `.css` —
	// both must be referenced from the extracted HTML.
	const scriptMatch = extracted.match(/<script src="([^"]+)">/);
	expect(scriptMatch).not.toBeNull();
	expect(scriptMatch[1]).toMatch(/\.js$/);

	const linkMatch = extracted.match(
		/<link rel="stylesheet" href="([^"]+)">/
	);
	expect(linkMatch).not.toBeNull();
	expect(linkMatch[1]).toMatch(/\.css$/);

	// The referenced files actually exist on disk.
	expect(() => readFile(scriptMatch[1])).not.toThrow();
	const css = readFile(linkMatch[1]);
	expect(css).toContain("color: green");
});
