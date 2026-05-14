import page from "./page.html";

it("should process inline <style> tags through the CSS pipeline", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();

	// Original CSS selectors still appear in the output (CSS pipeline
	// passes them through unchanged, only resolving url() references).
	expect(page).toContain(".foo");
	expect(page).toContain(".bar");
	expect(page).toContain(".baz");
	expect(page).toContain("body");

	// `url("./pixel.png")` got rewritten to an asset URL.
	expect(page).not.toContain('url("./pixel.png")');
	expect(page).toMatch(/url\(handled-pixel\.png\)/);

	// `<style type="text/foo">` content is left as-is.
	expect(page).toContain("this stays");

	// The original `<style>` tag wrappers survive — the close-tag count
	// matches the four `<style>` openings.
	expect((page.match(/<style[^>]*>/g) || []).length).toBe(4);
	expect((page.match(/<\/style>/g) || []).length).toBe(4);

	// The CSS-typed style tags (1, 2, 4) get routed through the CSS
	// pipeline and emit a `data:text/css,…` source-comment header.
	// Style 3 (`type="text/foo"`) stays raw, so the marker only shows up
	// three times.
	const cssHeaderCount = (page.match(/css data:text\/css,/g) || []).length;
	expect(cssHeaderCount).toBe(3);
});
