import value, { a, b, c, ns, local } from "./reexports";

it("should not concatenate modules without provided exports info", () => {
	expect(a).toBe("a");
	expect(b).toBe("b");
	expect(c).toBe("c");
	expect(ns.a).toBe("a");
	expect(value).toBe("d");
	expect(local).toBe("local");
});
