import * as C from "./reexport-namespace";
import { counter } from "./reexport-namespace";
import * as C2 from "./reexport-namespace-again";

it("should allow to reexport namespaces 1", () => {
	counter.reset();
	expect(counter.counter).toBe(0);
	counter.increment();
	expect(counter.counter).toBe(1);
});

it("should allow to reexport namespaces 2", () => {
	C.counter.reset();
	expect(C.counter.counter).toBe(0);
	C.counter.increment();
	expect(C.counter.counter).toBe(1);
});

it("should allow to reexport namespaces 3", () => {
	C2.CC.counter.reset();
	expect(C2.CC.counter.counter).toBe(0);
	C2.CC.counter.increment();
	expect(C2.CC.counter.counter).toBe(1);
});

import CJS from "./cjs";

it("should be able to call a deep function in commonjs", () => {
	expect(CJS.a.b.c.d()).toBe(42);
});
