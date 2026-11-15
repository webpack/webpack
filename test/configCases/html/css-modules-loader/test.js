const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
const styles = page.slice(page.indexOf("<style"), page.indexOf("</head>"));
const [moduleStyle, scssStyle, plainStyle] = styles.split("</style>");

it("should run a dependency rule's loaders on every <style module> body", () => {
	expect(moduleStyle).toContain("/* MODULE */");
	expect(moduleStyle).toContain("/* GENERATED */");
	expect(moduleStyle).toMatch(/\.m_card \{\s*color: teal;/);
	expect(scssStyle).toContain("/* MODULE */");
	expect(scssStyle).toMatch(/color: teal;/);
});

it("should narrow a dependency rule to one lang with mimetype", () => {
	expect(scssStyle).toContain("/* SCSS_MODULE */");
	expect(scssStyle).toMatch(/border-color: navy;/);
	// `lang`'s own rule runs too.
	expect(scssStyle).toMatch(/\.m_badge \{\s*margin: 4px;/);
	expect(moduleStyle).not.toContain("SCSS_MODULE");
});

it("should keep a plain <style> out of the module rules", () => {
	expect(plainStyle).toContain("/* PLAIN */");
	expect(plainStyle).toMatch(/\.plain \{\s*color: gray;/);
	expect(plainStyle).not.toContain("/* MODULE */");
	expect(moduleStyle).not.toContain("/* PLAIN */");
});

it("should match both kinds of inline style with one pattern", () => {
	for (const style of [moduleStyle, scssStyle, plainStyle]) {
		expect(style).toContain("/* ANY */");
	}
	expect(moduleStyle).toMatch(/background: inherit;/);
	expect(plainStyle).toMatch(/background: inherit;/);
});

it("should scope the names a loader writes and rewrite the page with them", () => {
	expect(moduleStyle).toMatch(/\.m_generated \{\s*color: red;\s*\}/);
	expect(page).toContain(
		'<div class="m_card m_generated m_badge plain">one</div>'
	);
});

it("should generate the page", () => {
	expect(page).toMatchSnapshot();
});
