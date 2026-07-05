import page from "./page.html";

it("should rewrite svg-namespace fill/stroke urls but skip html elements", () => {
	// HTML-namespace div: fill/stroke must NOT be rewritten
	expect(page).toContain('fill="url(./icon.svg)"');
	expect(page).toContain('stroke="url(./icon.svg)"');
	// SVG-namespace circle: fill IS rewritten to hashed asset
	expect(page).not.toContain('fill="url(./icon.svg)" cx');
	expect(page).toMatch(/fill="url\([a-f0-9]+\.svg\)"/);
	expect(page).toMatchSnapshot();
});
