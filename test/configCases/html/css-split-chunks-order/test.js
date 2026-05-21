const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should reference split CSS chunks with <link rel=stylesheet> and the JS chunk with <script>", () => {
	const extracted = readFile("page.html");
	expect(extracted).toMatchSnapshot();

	// One `<script>` tag for the JS entry chunk.
	const scriptSrcRe = /<script src="([^"]+)">/g;
	const scriptSrcs = [];
	for (let m; (m = scriptSrcRe.exec(extracted)); ) scriptSrcs.push(m[1]);
	expect(scriptSrcs).toHaveLength(1);
	expect(scriptSrcs[0]).toMatch(/\.js$/);

	// Two `<link rel="stylesheet">` tags, one per split CSS chunk.
	const linkHrefRe = /<link rel="stylesheet" href="([^"]+)">/g;
	const linkHrefs = [];
	for (let m; (m = linkHrefRe.exec(extracted)); ) linkHrefs.push(m[1]);
	expect(linkHrefs).toHaveLength(2);
	for (const href of linkHrefs) {
		expect(href).toMatch(/\.css$/);
		// Every referenced URL must exist on disk.
		expect(() => readFile(href)).not.toThrow();
	}
	// Source import order in entry.js is style1, style2 — the cascade
	// must match (so style2 wins and `.hero` ends up green). That's the
	// html-webpack-plugin#1838 / mini-css-extract#959 fix.
	expect(linkHrefs).toEqual(["style1.css", "style2.css"]);

	// JS executes after all stylesheets have been declared.
	const scriptIdx = extracted.indexOf("<script");
	const lastLinkIdx = extracted.lastIndexOf("<link rel=\"stylesheet\"");
	expect(lastLinkIdx).toBeLessThan(scriptIdx);

	expect(readFile("style1.css")).toContain("color: red");
	expect(readFile("style2.css")).toContain("color: green");
});
