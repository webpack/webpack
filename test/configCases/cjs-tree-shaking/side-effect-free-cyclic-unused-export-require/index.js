import { A } from "./a.cjs";
import { B } from "./b.cjs";

// `fromA`/`fromB` stay unused, so each require references no export while both
// modules are still required and evaluated. Walking them has to be recorded
// separately from any usage flag, or this cycle never reaches a fixpoint and
// the compilation hangs.
it("terminates on cyclic evaluation-only requires between side-effect-free modules", () => {
	expect(A).toBe(1);
	expect(B).toBe(2);
	const src = String(__webpack_modules__["./a.cjs"]);
	expect(src).toMatch(/unused reexport/);
});
