import page from "./page.html";

it("should treat a list without `'...'` as opt-out of defaults", () => {
	// `./missing.css`, `./missing.js`, `./missing.png` don't exist; the
	// build only succeeds because their attributes aren't in the user's
	// list and are left untouched.
	expect(page).toContain('href="./missing.css"');
	expect(page).toContain('src="./missing.js"');
	expect(page).toContain('src="./missing.png"');
});

it("should still rewrite the user's custom data-src", () => {
	expect(page).not.toContain('data-src="./lazy.png"');
	expect(page).toMatch(/data-src="[^"]+\.png"/);
});
