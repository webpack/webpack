const fs = require("fs");
const path = require("path");

const readFile = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("emits every stylesheet <link> before any <script>", () => {
	const html = readFile("page.html");

	const firstScriptIdx = html.indexOf("<script");
	const lastLinkIdx = html.lastIndexOf('<link rel="stylesheet"');
	expect(lastLinkIdx).toBeGreaterThan(-1);
	expect(lastLinkIdx).toBeLessThan(firstScriptIdx);

	// Both entries' CSS reach the HTML, in document (cascade) order.
	const linkHrefs = [];
	const linkRe = /<link rel="stylesheet" href="([^"]+)">/g;
	for (let m; (m = linkRe.exec(html)); ) linkHrefs.push(m[1]);
	expect(linkHrefs).toHaveLength(2);
	for (const href of linkHrefs) {
		expect(() => readFile(href)).not.toThrow();
	}
});
