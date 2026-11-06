import page from "./page.html";

it("should keep a nomodule script apart from the deferred run around it", () => {
	const tags = page.match(/<script\b[^>]*><\/script[^>]*>/gi) || [];
	// The tags after it do not join the run before it, so source order holds.
	expect(tags).toHaveLength(3);
	expect(tags[0]).not.toMatch(/\bnomodule\b/);
	expect(tags[1]).toMatch(/\bnomodule\b/);
	expect(tags[2]).not.toMatch(/\bnomodule\b/);
});
