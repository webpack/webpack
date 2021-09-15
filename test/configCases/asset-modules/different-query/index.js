it("should handle different querystrings for assets correctly", () => {
	const a = new URL("../_images/file.png?foo=bar", import.meta.url);
	const b = new URL("../_images/file.png?bar=foo", import.meta.url);
	const c = new URL("../_images/file.png", import.meta.url);
	const d = new URL("../_images/file.png", import.meta.url);
	expect(b.pathname).toBe(a.pathname);
	expect(c.pathname).toBe(a.pathname);
	expect(d.pathname).toBe(a.pathname);
	expect(a.search).toBe("?foo=bar");
	expect(b.search).toBe("?bar=foo");
	expect(c.search).toBe("");
});
