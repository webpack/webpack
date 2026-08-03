// the ESM import makes this entry a concatenation root; "user" is absorbed as a
// wrapped member while its require() target bails out (sloppy mode)
import { tag } from "./member";
import { pick, callLater } from "./user";

// snapshot before anything forces the bailed-out target
const ORDER_AT_LOAD = (global.__lazyBailoutOrder || []).slice();

it("should absorb the requiring module but not its bailed-out target", () => {
	expect(tag).toBe("member");
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	const absorbed = concatModules[0].modules.map((m) => m.name);
	expect(absorbed).toContain("./user.js");
	expect(absorbed).not.toContain("./sloppy-target.js");
});

it("should not evaluate a bailed-out require() target at bundle load", () => {
	expect(ORDER_AT_LOAD).not.toContain("sloppy");
});

it("should never evaluate a bailed-out require() in a branch that is not taken", () => {
	expect(pick(false)).toBe("none");
	expect(global.__lazyBailoutOrder || []).not.toContain("sloppy");
});

it("should evaluate a bailed-out require() target when its call site runs", () => {
	expect(callLater()).toBe("sloppy");
	expect(global.__lazyBailoutOrder).toContain("sloppy");
	delete global.__lazyBailoutOrder;
});
