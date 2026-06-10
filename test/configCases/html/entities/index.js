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

it("should treat entity-encoded whitespace as candidate separators in srcset", () => {
	// `&#32;` is a space after decoding, so the value is two candidates; the
	// URLs are rewritten in place while the entity text stays raw around them.
	expect(page).toMatch(/srcset="[^"&]+\.png&#32;1x,&#32;[^"&]+\.png 2x"/);
});

it("should decode attribute values for filter comparisons", () => {
	// `rel="&#105;con"` decodes to `icon`, `name="twitter&#58;image"` to
	// `twitter:image` — both must pass the link/meta filters and resolve.
	expect(page).toMatch(/<link rel="&#105;con" href="[^"]+\.png">/);
	expect(page).toMatch(/<meta name="twitter&#58;image" content="[^"]+\.png">/);
	expect(page).not.toContain('href="./image.png"');
	expect(page).not.toContain('content="./image.png"');
});
