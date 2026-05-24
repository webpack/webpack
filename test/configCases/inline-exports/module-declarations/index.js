import { REMOVE_with_import } from "./import.js";
import { REMOVE_with_export_all } from "./export-all.js";
import { REMOVE_with_named_reexport } from "./named-reexport.js";
import { REMOVE_with_namespace_reexport } from "./namespace-reexport.js";
import { REMOVE_with_side_effect_reexport } from "./side-effect-reexport.js";
import { REMOVE_with_all_module_declarations } from "./combined.js";

const fs = __non_webpack_require__("fs");
const generated = /** @type {string} */ (fs.readFileSync(__filename, "utf-8"));

it("should inline constants from modules with import and re-export declarations", () => {
	// START
	expect(REMOVE_with_import).toBe(123);
	expect(REMOVE_with_export_all).toBe(456);
	expect(REMOVE_with_named_reexport).toBe(789);
	expect(REMOVE_with_namespace_reexport).toBe(654);
	expect(REMOVE_with_side_effect_reexport).toBe(987);
	expect(REMOVE_with_all_module_declarations).toBe(321);
	// END
	expect(globalThis.__inlineConstModuleDeclarationsSideEffect).toBe(3);
	const block = generated.match(/\/\/ START([\s\S]*)\/\/ END/)[1];
	expect(
		block.includes(`((/* inlined export .REMOVE_with_import */123)).toBe(123)`)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_with_export_all */456)).toBe(456)`
		)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_with_named_reexport */789)).toBe(789)`
		)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_with_namespace_reexport */654)).toBe(654)`
		)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_with_side_effect_reexport */987)).toBe(987)`
		)
	).toBe(true);
	expect(
		block.includes(
			`((/* inlined export .REMOVE_with_all_module_declarations */321)).toBe(321)`
		)
	).toBe(true);
});
