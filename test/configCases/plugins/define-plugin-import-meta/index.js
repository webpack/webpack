it("should define a member of an import.meta object key", function () {
	expect(import.meta.config.TOKEN).toBe("token");
});
it("should resolve unknown import.meta member access with undefined (issue 15559)", function () {
	const a = function () { return import.meta.config.MISSING; };
	const b = function () { return import.meta.config?.MISSING; };
	const c = function () { return import.meta.config.MISSING?.(); };
	expect(a.toString()).toBe("function () { return undefined; }");
	expect(b.toString()).toBe("function () { return undefined; }");
	expect(c.toString()).toBe("function () { return undefined?.(); }");
	expect(import.meta.config.MISSING).toBe(undefined);
	expect(import.meta.config?.MISSING).toBe(undefined);
	expect(import.meta.config.MISSING?.()).toBe(undefined);
});
