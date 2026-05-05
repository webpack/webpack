import * as eager from "./dep.js";
import defer * as deferred1 from "./dep.js";
import defer * as deferred2 from "./dep.js";
import { ns as deferredFromOtherFile } from "./reexport.js";

it("shares the deferred namespace across call sites in the same file", () => {
	expect(deferred1).toBe(deferred2);
});

it("shares the deferred namespace across files", () => {
	expect(deferred1).toBe(deferredFromOtherFile);
});

it("keeps the deferred namespace distinct from the eager namespace", () => {
	expect(deferred1).not.toBe(eager);
	expect(deferred1.value).toBe(eager.value);
});

it("shares the deferred namespace between static defer and dynamic import.defer (mode bit 16)", async () => {
	const dynamic = await import.defer("./dep.js");
	expect(dynamic).toBe(deferred1);
});
