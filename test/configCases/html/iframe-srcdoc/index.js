import page from "./page.html";

it("should rewrite asset URLs inside <iframe srcdoc>", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// No original (unresolved) asset URL survives.
	expect(page).not.toContain("./pixel.png");
	expect(page).not.toContain("./other.png");

	// `src` is rewritten and the processed HTML re-escaped for the attribute,
	// exercising all three escapes: `"` -> `&quot;`, `'` -> `&#39;`, `&` -> `&amp;`.
	expect(page).toMatch(
		/srcdoc="<img src=&quot;handled-pixel\.png&quot; alt=&quot;a&#39;b&amp;c&quot;>"/
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

	// A single-quoted `srcdoc='...'` attribute is handled too.
	expect(page).toMatch(/srcdoc='<img src=&quot;handled-pixel\.png&quot;>'/);

	// Non-`img` asset references (here `<link href>`) are rewritten as well.
	expect(page).toMatch(
		/srcdoc="<link rel=&quot;icon&quot; href=&quot;handled-pixel\.png&quot;>"/
	);

	// URLs inside srcdoc go through the same pipeline as top-level HTML: a
	// resolvable asset is emitted/rewritten, while absolute and protocol-relative
	// URLs become the `data:,` ignored-asset (delegated, not special-cased).
	expect(page).toMatch(
		/srcdoc="<img src=&quot;handled-pixel\.png&quot;><img src=&quot;data:,&quot;><img src=&quot;data:,&quot;>"/
	);

	// Nested `<iframe srcdoc>` recurses; the multi-level escaping turns the inner
	// `&quot;` into `&amp;quot;` while the innermost asset is still rewritten.
	expect(page).toMatch(
		/srcdoc="<iframe srcdoc=&quot;<img src=&amp;quot;handled-pixel\.png&amp;quot;>&quot;>"/
	);

	// Plain text (no markup) is left untouched — no nested module is spun up.
	expect(page).toContain('srcdoc="no assets here"');
});
