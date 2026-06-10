import page from "./page.html";

it("should match user-configured sources against adjusted camelCase SVG tag names", () => {
	// `tag` given lowercase, AST carries `feImage`
	expect(page).toContain('<feImage href="image.png"/>');
	// `tag` given camelCase, must match too
	expect(page).toContain('<foreignObject data-src="image.png">');
	// Defaults are disabled (no "..."), so <img src> stays untouched
	expect(page).toContain('<img src="./image.png"');
	expect(page).toMatchSnapshot();
});
