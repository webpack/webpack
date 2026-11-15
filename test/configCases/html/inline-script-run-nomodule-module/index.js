import page from "./page.html";

it("should leave a nomodule script as written with module output", () => {
	expect(page).toContain("<script nomodule>window.MARK_B = 2;</script>");
	expect(page).toMatch(/<script nomodule src="[^"]+\.js"><\/script>/);
	expect(page).not.toContain('type="module" nomodule');
	// It stays where it was written, between the two module scripts.
	const inline = page.indexOf("<script nomodule>window.MARK_B");
	expect(page.indexOf('type="module"')).toBeLessThan(inline);
	expect(page.lastIndexOf('type="module"')).toBeGreaterThan(inline);
});
