import page from "./page.html";

it("should resolve url() references in SVG marker and cursor presentation attributes", () => {
	expect(page).not.toContain("./marker.svg");
	// External FuncIRIs in marker/marker-start/marker-mid/marker-end/cursor are rewritten
	expect(page).toMatch(/\bmarker="url\([0-9a-f]+\.svg#a\)"/);
	expect(page).toMatch(/\bmarker-start="url\('[0-9a-f]+\.svg#s'\)"/);
	expect(page).toMatch(/\bmarker-mid="url\([0-9a-f]+\.svg#m\)"/);
	expect(page).toMatch(/\bmarker-end="url\([0-9a-f]+\.svg#e\)"/);
	expect(page).toMatch(/\bcursor="url\([0-9a-f]+\.svg\)"/);
	// Internal FuncIRI references stay untouched
	expect(page).toContain('marker-start="url(#arrow)"');
	expect(page).toMatchSnapshot();
});
