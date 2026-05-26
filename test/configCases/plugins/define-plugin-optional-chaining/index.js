it("should resolve unknown optional and computed member access with undefined (issue 15559)", function () {
	const a = function () { return OBJECT?.SUB1?.UNKNOWN; };
	const b = function () { return OBJECT?.["SUB1"]?.["UNKNOWN"]; };
	const c = function () { return NOT_DEFINED?.SUB2?.b; };
	const d = function () { return NOT_DEFINED?.["SUB2"]?.["b"]; };
	expect(a.toString()).toBe("function () { return undefined; }");
	expect(b.toString()).toBe("function () { return undefined; }");
	expect(c.toString()).toBe("function () { return undefined; }");
	expect(d.toString()).toBe("function () { return undefined; }");
	expect(OBJECT?.SUB1?.UNKNOWN).toBe(undefined);
	expect(NOT_DEFINED?.SUB2?.b).toBe(undefined);
});
it("should resolve optional calls on an unknown member without inlining the object (issue 15559)", function () {
	const a = function () { return OBJECT.SUB1.UNKNOWN?.(); };
	const b = function () { return NOT_DEFINED.SUB2.b?.(); };
	const c = function () { return OBJECT.SUB1?.UNKNOWN?.(); };
	const d = function () { return OBJECT?.SUB1?.UNKNOWN?.(); };
	const e = function () { return OBJECT.SUB1["UNKNOWN"]?.(); };
	const f = function () { return OBJECT.SUB1.UNKNOWN?.().deep; };
	expect(a.toString()).toBe("function () { return undefined?.(); }");
	expect(b.toString()).toBe("function () { return undefined?.(); }");
	expect(c.toString()).toBe("function () { return undefined?.(); }");
	expect(d.toString()).toBe("function () { return undefined?.(); }");
	expect(e.toString()).toBe("function () { return undefined?.(); }");
	expect(f.toString()).toBe("function () { return undefined?.().deep; }");
	expect(OBJECT.SUB1.UNKNOWN?.()).toBe(undefined);
	expect(OBJECT?.SUB1?.UNKNOWN?.()).toBe(undefined);
	expect(NOT_DEFINED.SUB2.b?.()).toBe(undefined);
	expect(OBJECT.SUB1.UNKNOWN?.().deep).toBe(undefined);
});
it("should resolve unknown member calls with optional members without inlining the object (issue 15559)", function () {
	const a = function () { return OBJECT.SUB1?.UNKNOWN(); };
	const b = function () { return OBJECT?.SUB1?.UNKNOWN(); };
	const c = function () { return NOT_DEFINED.SUB2?.b(); };
	expect(a.toString()).toBe("function () { return undefined(); }");
	expect(b.toString()).toBe("function () { return undefined(); }");
	expect(c.toString()).toBe("function () { return undefined(); }");
	expect(() => OBJECT.SUB1?.UNKNOWN()).toThrow();
});
it("should still substitute arguments of an unknown member call (issue 15559)", function () {
	const a = function () { return OBJECT.SUB1.UNKNOWN?.(STRING); };
	expect(a.toString()).toBe('function () { return undefined?.("string"); }');
	expect(OBJECT.SUB1.UNKNOWN?.(STRING)).toBe(undefined);
});
