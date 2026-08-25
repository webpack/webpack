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
it("should short-circuit a call reached through an unknown import.meta member (issue 21822)", function () {
	const a = function () { return import.meta.config.MISSING?.includes("token"); };
	const b = function () { return import.meta.config?.MISSING?.deep.method(); };
	const c = function () { return import.meta.config.MISSING.deep?.method(); };
	expect(a.toString()).toBe("function () { return undefined; }");
	expect(b.toString()).toBe("function () { return undefined; }");
	expect(c.toString()).toBe("function () { return undefined.deep?.method(); }");
	expect(import.meta.config.MISSING?.includes("token")).toBe(undefined);
	expect(import.meta.config?.MISSING?.deep.method()).toBe(undefined);
	expect(import.meta.config.TOKEN?.toUpperCase()).toBe("TOKEN");
	expect(() => import.meta.config.MISSING.deep?.method()).toThrow();
});
