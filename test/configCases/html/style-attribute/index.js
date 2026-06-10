import page from "./page.html";

it("should resolve url() references inside `style` attributes", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// The CSS declarations themselves pass through unchanged.
	expect(page).toContain("color: red");

	// `url(./pixel.png)` (quoted and unquoted) is rewritten to an asset URL.
	expect(page).not.toContain("url(./pixel.png)");
	expect(page).not.toContain("url('./pixel.png')");
	expect(page).toMatch(/url\(handled-pixel\.png\)/);

	// `image-set()` references are resolved too (the string form is
	// rewritten to a `url()`).
	expect(page).toMatch(/image-set\(url\(handled-pixel\.png\) 1x\)/);

	// A `style` attribute with no URL-bearing function is left untouched.
	expect(page).toContain('style="color: blue;"');
});

it("should decode character references and re-escape on write-back", () => {
	// `url(./pixel&#46;png)` decodes to `./pixel.png` and resolves.
	expect(page).not.toContain("pixel&#46;png");

	// A decoded `"` (from `&quot;`) is re-escaped when the processed CSS is
	// written back into the attribute (quotes are escaped for any quoting
	// context), keeping the HTML valid.
	expect(page).toMatch(/style="--quote: &#39;&quot;&#39;;[^"]*"/);
});
