it("should keep parentheses balanced around new URL() arguments", () => {
	const a = new URL("./file.txt", (import.meta.url));
	const b = new URL(("./file.txt"), import.meta.url);
	const c = new URL((("./file.txt")), ((import.meta.url)));
	const d = new (URL)(("./file.txt"), (import.meta.url));
	const e = new URL /* ( */ (("./file.txt"), import.meta.url);
	expect(a.href).toMatch(/file\.txt$/);
	expect(b.href).toBe(a.href);
	expect(c.href).toBe(a.href);
	expect(d.href).toBe(a.href);
	expect(e.href).toBe(a.href);
	let matched = false;
	if (new URL("./file.txt", (import.meta.url)).href === a.href) {
		matched = true;
	}
	expect(matched).toBe(true);
});
