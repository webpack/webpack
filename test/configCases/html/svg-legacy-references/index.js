import page from "./page.html";

it("should resolve references in legacy SVG elements (font-face-uri, cursor, altGlyph, tref, glyphRef)", () => {
	expect(page).not.toContain("./font.ttf");
	expect(page).not.toContain("./cur.png");
	expect(page).not.toContain("./ref.svg");
	// External font/cursor files are emitted as assets.
	expect(page).toMatch(/<font-face-uri xlink:href="[0-9a-f]+\.ttf"\/>/);
	expect(page).toMatch(/<cursor xlink:href="[0-9a-f]+\.png"\/>/);
	// External `file.svg#id` element references are rewritten, keeping the fragment.
	expect(page).toMatch(/<altGlyph xlink:href="[0-9a-f]+\.svg#g">/);
	expect(page).toMatch(/<tref xlink:href="[0-9a-f]+\.svg#t"\/>/);
	expect(page).toMatch(/<glyphRef xlink:href="[0-9a-f]+\.svg#gr"\/>/);
	// A fragment-only reference stays untouched.
	expect(page).toContain('<use xlink:href="#local"/>');
	expect(page).toMatchSnapshot();
});
