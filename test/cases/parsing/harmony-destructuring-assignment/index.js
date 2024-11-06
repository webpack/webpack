import * as C from "./reexport-namespace";
import { counter } from "./reexport-namespace";
import { exportsInfo } from "./counter";
import { exportsInfo as exportsInfo2 } from "./counter2";
import * as counter3 from "./counter3";
import * as counter4 from "./counter4";

it("expect tree-shake unused exports #1", () => {
	const { D } = C;
	expect(D).toBe(1);
	expect(C.exportsInfo.D).toBe(true);
	expect(C.exportsInfo.E).toBe(false);
});

it("expect tree-shake unused exports #2", () => {
	const { d, c } = C.counter;
	const { ['d']: d1 } = counter;
	expect(d).toBe(1);
	expect(c).toBe(1);
	expect(d1).toBe(1);
	expect(exportsInfo.d).toBe(true);
	expect(exportsInfo.c).toBe(true);
	expect(exportsInfo.counter).toBe(false);
});

it("expect multiple assignment work correctly", () => {
	const { e, d: d1 } = counter4;
	let c1;
	const { f, d: d2 } = { c: c1 } = counter4;
	expect(c1).toBe(1);
	expect(d1).toBe(1);
	expect(d2).toBe(1);
	expect(e).toBe(1);
	expect(f).toBe(1);
	expect(counter4.exportsInfo.c).toBe(true);
	expect(counter4.exportsInfo.d).toBe(true);
	expect(counter4.exportsInfo.e).toBe(true);
	expect(counter4.exportsInfo.f).toBe(true);
	expect(counter4.exportsInfo.g).toBe(false);
	expect(counter4.exportsInfo.counter).toBe(false);
});

it("expect tree-shake bailout when rest element is used", () => {
	const { d, ...rest } = counter3;
	expect(d).toBe(1);
	expect(rest.exportsInfo.d).toBe(true);
	expect(rest.exportsInfo.counter).toBe(true);
});

it("expect no support of \"deep\" tree-shaking", () => {
	const { counter2: { d } } = C;
	expect(d).toBe(1);
	expect(exportsInfo2.d).toBe(true);
	expect(exportsInfo2.counter).toBe(true);
});
