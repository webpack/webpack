import page from "./page.html";

it("should resolve legacy and obsolete source attributes", () => {
	expect(page).not.toContain("./ref.png");
	// Legacy preview-image hints
	expect(page).toMatch(/<link rel="image_src" href="[0-9a-f]+\.png">/);
	expect(page).toMatch(/<meta name="thumbnail" content="[0-9a-f]+\.png">/);
	// Obsolete <object>/<applet>
	expect(page).toMatch(/classid="[0-9a-f]+\.png"/);
	expect(page).toMatch(
		/<param name="movie" valuetype="ref" value="[0-9a-f]+\.png">/
	);
	expect(page).toMatch(/code="[0-9a-f]+\.png"/);
	expect(page).toMatch(/object="[0-9a-f]+\.png"/);
	// MathML <mglyph src>
	expect(page).toMatch(/<mglyph src="[0-9a-f]+\.png">/);
	// A <param> without valuetype="ref" is an opaque string, left untouched
	expect(page).toContain('value="./skip.png"');
	expect(page).toMatchSnapshot();
});
