import page from "./page.html";

it("should rewrite asset URLs inside <template> content", () => {
	// No original URL survives, including inside nested templates
	expect(page).not.toContain("./image.png");
	expect(page).toMatchSnapshot();
});
