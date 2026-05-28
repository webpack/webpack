import * as constExports from "./const-exports";
import * as fnExports from "./function-exports";
import * as mutableExports from "./mutable-exports";
import * as cycleA from "./cycle-a";
import * as reexported from "./reexport";
import * as reexportChain from "./reexport-chain";
import * as reexportMixed from "./reexport-mixed";
import * as reexportStar from "./reexport-star";
import * as reexportCircular from "./reexport-circular";

function expectValueDescriptor(ns, key) {
	const descriptor = Object.getOwnPropertyDescriptor(ns, key);
	expect(descriptor.get).toBe(undefined);
	expect(descriptor.enumerable).toBe(true);
	expect(descriptor.writable).toBe(false);
}

function expectGetterDescriptor(ns, key) {
	const descriptor = Object.getOwnPropertyDescriptor(ns, key);
	expect(typeof descriptor.get).toBe("function");
	expect(descriptor.enumerable).toBe(true);
	expect(Object.prototype.hasOwnProperty.call(descriptor, "value")).toBe(false);
}

// === Direct exports ===

it("should bind const exports as readonly values (non-circular)", () => {
	expectValueDescriptor(constExports, "literal");
	expect(constExports.literal).toBe("literal");
	expectValueDescriptor(constExports, "renamed");
	expect(constExports.renamed).toBe("local");
	expectValueDescriptor(constExports, "destructured");
	expect(constExports.destructured).toBe("destructured");
	expectValueDescriptor(constExports, "arrayValue");
	expect(constExports.arrayValue).toBe("array");
	expectValueDescriptor(constExports, "string-alias");
	expect(constExports["string-alias"]).toBe("aliased");
});

it("should keep function exports as getters", () => {
	expectGetterDescriptor(fnExports, "fn");
	expect(fnExports.fn()).toBe("fn");
	expectGetterDescriptor(fnExports, "fn2");
	expect(fnExports.fn2()).toBe("fn2");
});

it("should keep mutable exports as getters", () => {
	expectGetterDescriptor(mutableExports, "counter");
	expect(mutableExports.counter).toBe(0);
	mutableExports.increment();
	expect(mutableExports.counter).toBe(1);
});

it("should work correctly with circular modules", () => {
	expect(cycleA.cyclicConst).toBe("cyclic");
	expect(cycleA.readViaB()).toBe("cyclic");
});

// === Re-exports (all use getters — re-export optimization not yet supported) ===

it("should keep re-exported const as getter", () => {
	expectGetterDescriptor(reexported, "literal");
	expect(reexported.literal).toBe("literal");
});

it("should keep re-exported function as getter", () => {
	expectGetterDescriptor(reexported, "fn");
	expect(reexported.fn()).toBe("fn");
});

it("should keep re-exported mutable as getter with live binding", () => {
	expectGetterDescriptor(reexported, "counter");
	const before = reexported.counter;
	reexported.increment();
	expect(reexported.counter).toBe(before + 1);
});

it("should use getter for multi-level re-export chain", () => {
	expectGetterDescriptor(reexportChain, "chainedLiteral");
	expect(reexportChain.chainedLiteral).toBe("literal");
});

it("should bind own const as value in mixed module", () => {
	expectValueDescriptor(reexportMixed, "ownConst");
	expect(reexportMixed.ownConst).toBe("own");
});

it("should keep re-exported values in mixed module", () => {
	expect(reexportMixed.reConst).toBe("literal");
	expect(reexportMixed.reFn()).toBe("fn");
});

it("should keep re-exported mutable as live binding in mixed module", () => {
	const before = reexportMixed.reCounter;
	reexportMixed.reIncrement();
	expect(reexportMixed.reCounter).toBe(before + 1);
});

it("should use getter for named re-export with export *", () => {
	expectGetterDescriptor(reexportStar, "namedConst");
	expect(reexportStar.namedConst).toBe("literal");
});

it("should keep star-exported function as getter", () => {
	expectGetterDescriptor(reexportStar, "fn");
	expect(reexportStar.fn()).toBe("fn");
});

it("should use getter for re-export from circular module", () => {
	expectGetterDescriptor(reexportCircular, "reCircular");
	expect(reexportCircular.reCircular).toBe("cyclic");
});
