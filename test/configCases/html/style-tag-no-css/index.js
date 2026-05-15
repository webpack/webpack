import page from "./page.html";

it("should leave inline <style> bodies untouched without the CSS experiment", () => {
	expect(typeof page).toBe("string");
	// Without `experiments.css`, the CSS pipeline isn't installed; the
	// inline style body must round-trip verbatim and the walker must still
	// have skipped past `</style>` so the rawtext isn't reparsed as HTML.
	expect(page).toContain("body { color: red; }");
	expect(page).not.toContain("data:text/css");
});
