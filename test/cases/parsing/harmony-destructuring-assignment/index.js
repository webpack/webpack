import * as C from "./reexport-namespace";
import { counter } from "./reexport-namespace";
import { exportsInfo } from "./counter";
import { exportsInfo as exportsInfo2 } from "./counter2";

it("expect tree-shake unused exports #1", () => {
	const { D } = C;
	expect(D).toBe(1);
	expect(C.exportsInfo.D).toBe(true);
	expect(C.exportsInfo.E).toBe(false);
});

it("expect tree-shake unused exports #2", () => {
	const { d } = C.counter;
	const { ['d']: d1 } = counter;
	expect(d).toBe(1);
	expect(d1).toBe(1);
	expect(exportsInfo.d).toBe(true);
	expect(exportsInfo.counter).toBe(false);
});

it("expect no support of \"deep\" tree-shaking", () => {
	const { counter2: { d } } = C;
	expect(d).toBe(1);
	expect(exportsInfo2.d).toBe(true);
	expect(exportsInfo2.counter).toBe(true);
});
