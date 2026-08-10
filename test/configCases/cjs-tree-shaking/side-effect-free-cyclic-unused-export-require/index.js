import { A } from "./a.cjs";
import { B } from "./b.cjs";

// Unused cyclic reexports between side-effect-free modules must deactivate
// without hanging, while used exports stay.
it("terminates on cyclic unused reexports between side-effect-free modules", () => {
	expect(A).toBe(1);
	expect(B).toBe(2);
	const src = String(__webpack_modules__["./a.cjs"]);
	expect(src).toMatch(/\/\* unused reexport \*\/ 0/);
});
