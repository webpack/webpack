import page from "./page.html";

it("should resolve external url() references in SVG presentation attributes", () => {
	// All external `url(./refs.svg#…)` references are rewritten
	expect(page).not.toContain("./refs.svg");
	expect(page).toMatch(/fill="url\([0-9a-f]+\.svg#grad\)"/);
	expect(page).toMatch(/stroke="url\('[0-9a-f]+\.svg#stroke'\)"/);
	expect(page).toMatch(/mask="url\(&quot;[0-9a-f]+\.svg#m&quot;\)"/);
	// Same-document fragments stay untouched
	expect(page).toContain('fill="url(#local-grad)"');
	// HTML elements don't get presentation-attribute treatment
	expect(page).toContain('fill="url(./should-not-resolve.svg#x)"');
	expect(page).toMatchSnapshot();
});

it("should resolve external textPath and mpath references", () => {
	expect(page).toMatch(/<textPath href="[0-9a-f]+\.svg#curve">/);
	expect(page).toMatch(/<mpath href="[0-9a-f]+\.svg#curve"\/>/);
	// Fragment-only references stay untouched
	expect(page).toContain('xlink:href="#local-path"');
	expect(page).toContain('xlink:href="#local-motion"');
});
