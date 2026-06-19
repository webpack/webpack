import page from "./page.html";

it("should rewrite asset URLs inside <iframe srcdoc>", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// No original (unresolved) asset URL survives.
	expect(page).not.toContain("./pixel.png");
	expect(page).not.toContain("./other.png");

	// `src` is rewritten and re-escaped (`"` -> `&quot;`, decoded `'` -> `&#39;`).
	expect(page).toMatch(
		/srcdoc="<img src=&quot;handled-pixel\.png&quot; alt=&quot;a&#39;b&quot;>"/
	);

	// Markup without assets passes through unchanged (idempotent).
	expect(page).toContain('srcdoc="<p>hello <b>world</b></p>"');

	// Multiple assets in one document are all rewritten.
	expect(page).toMatch(
		/srcdoc="<img src=&quot;handled-pixel\.png&quot;><img src=&quot;handled-other\.png&quot;>"/
	);

	// An entity inside the URL (`&#46;` = `.`) is decoded before resolving.
	expect(page).not.toContain("pixel&#46;png");
	expect(page).toMatch(/srcdoc="<img src=&quot;handled-pixel\.png&quot;>"/);

	// CSS `url()` inside a nested `style` attribute composes with the CSS
	// pipeline: the url is rewritten and the inner quotes re-escaped for srcdoc.
	expect(page).toMatch(
		/srcdoc="<div style=&quot;background: url\(handled-pixel\.png\)&quot;>styled<\/div>"/
	);

	// Plain text (no markup) is left untouched — no nested module is spun up.
	expect(page).toContain('srcdoc="no assets here"');
});
