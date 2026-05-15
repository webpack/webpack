// The HTML file lives in `sub/`, while this entry (which sets the
// compilation context for webpack) lives one level up. Relative `url(...)`
// references inside an inline `<style>` must resolve against the HTML
// file's directory, not against the compiler context — otherwise
// `sub/pixel.png` would not be findable.
import page from "./sub/page.html";

it("should resolve inline-style url() relative to the HTML file directory", () => {
	expect(typeof page).toBe("string");
	expect(page).not.toContain('url("./pixel.png")');
	expect(page).toMatch(/url\(handled-pixel\.png\)/);
});
