import b, * as bb from "./b";

it("should keep optional chaining", () => {
	expect(b?.a?.a).toBe(undefined);
	expect(b?.a).toBe(undefined);
	expect(typeof bb?.a).toBe("object");
	expect(bb.call?.().c).toBe(1);
	expect(bb.call?.().b?.a).toBe(undefined);
	expect(bb.a?.call()).toBe(2);
	expect(bb.a?.c?.b).toBe(undefined);
});

it("should evaluate optional members", () => {
	if (!module.hot) {
		expect(
			module.hot?.accept((() => {throw new Error("fail")})())
		).toBe(undefined);
	}
});

it("should evaluate optional chaining as a part of statement", () => {
	if (module.hot?.accept) {
		module.hot?.accept("./a.js");
	} else {
		expect(module.hot).toBe(undefined);
	}
});
