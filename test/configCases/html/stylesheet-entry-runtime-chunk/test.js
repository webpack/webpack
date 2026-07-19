const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should not emit a <link rel=stylesheet> for the JS-only runtime chunk", () => {
	const html = readFile("page.html");
	const files = fs.readdirSync(__dirname);
	const re = /<link\s+rel="stylesheet"\s+href="([^"]+)"/g;
	const hrefs = [];
	let m;
	while ((m = re.exec(html)) !== null) {
		hrefs.push(m[1]);
	}
	// Every stylesheet link must point at an emitted `.css` file...
	expect(hrefs.length).toBeGreaterThan(0);
	for (const href of hrefs) {
		expect(href).toMatch(/\.css$/);
		expect(files).toContain(href);
	}
	// ...and none of them may be the runtime chunk (no `runtime.css` exists).
	expect(html).not.toContain('href="runtime.css"');
	expect(files).not.toContain("runtime.css");
});
