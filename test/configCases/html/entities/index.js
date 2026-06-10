import page from "./page.html";

it("should decode character references in attribute URLs before resolving", () => {
	// Original encoded URLs are all rewritten
	expect(page).not.toContain("im&#97;ge.png");
	expect(page).not.toContain("a&amp;b.png");
	expect(page).not.toContain("./image.png?x=1&amp;y=2");
	// A reference decoding to a fragment-only URL is left alone
	expect(page).toContain('src="&num;foo"');
	expect(page).toMatchSnapshot();
});
