import page from "./page.html";

it("should resolve external textPath and mpath references", () => {
	expect(page).not.toContain("./refs.svg");
	expect(page).toMatch(/<textPath href="[0-9a-f]+\.svg#curve">/);
	expect(page).toMatch(/<mpath href="[0-9a-f]+\.svg#curve"\/>/);
	// Fragment-only references stay untouched
	expect(page).toContain('xlink:href="#local-path"');
	expect(page).toContain('xlink:href="#local-motion"');
	expect(page).toMatchSnapshot();
});
