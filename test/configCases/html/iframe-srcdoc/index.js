import page from "./page.html";

it("should rewrite asset URLs inside <iframe srcdoc>", () => {
	expect(page).not.toContain("./image.png");
	expect(page).not.toContain("./im&#97;ge.png");
	// URLs are rewritten in place, inside the entity-escaped quoting
	expect(page).toMatch(/<img src=&quot;out-image\.png&quot;>/);
	expect(page).toMatch(/href=&quot;out-image\.png&quot;/);
	expect(page).toMatch(/srcset="out-image\.png 1x, out-image\.png 2x"/);
	expect(page).toMatchSnapshot();
});

it("should treat scripts inside srcdoc as plain assets, not entries", () => {
	// The iframe is a separate browsing context — its script can't share the
	// outer page's runtime, so it's emitted standalone.
	expect(page).not.toContain("./script.js");
	expect(page).toMatch(/<script src="out-script\.js">/);
	expect(page).not.toContain("__html_");
});

it("should recurse into nested srcdoc documents", () => {
	expect(page).not.toContain("./deep.png");
	expect(page).toMatch(/src=&amp;quot;out-deep\.png&amp;quot;/);
});

it("should leave <iframe src> (a document URL) untouched", () => {
	expect(page).toContain('src="./should-stay.html"');
});
