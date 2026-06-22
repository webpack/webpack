import page from "./page.html";

it("should resolve external SVG paint-server and color-profile references", () => {
	expect(page).not.toContain("./defs.svg");
	expect(page).not.toContain("./sRGB.icc");
	// linearGradient / radialGradient / pattern / filter href + xlink:href
	expect(page).toMatch(/<linearGradient id="g1" href="[0-9a-f]+\.svg#base"\/>/);
	expect(page).toMatch(
		/<radialGradient id="g2" xlink:href="[0-9a-f]+\.svg#base"\/>/
	);
	expect(page).toMatch(/<pattern id="p1" href="[0-9a-f]+\.svg#tile"\/>/);
	expect(page).toMatch(/<filter id="f1" xlink:href="[0-9a-f]+\.svg#blur"\/>/);
	// color-profile points at an external ICC profile file
	expect(page).toMatch(/<color-profile name="sRGB" xlink:href="[0-9a-f]+\.icc"\/>/);
	// Fragment-only references stay untouched
	expect(page).toContain('<linearGradient id="g3" href="#g1"/>');
	expect(page).toContain('fill="url(#g1)"');
	expect(page).toMatchSnapshot();
});
