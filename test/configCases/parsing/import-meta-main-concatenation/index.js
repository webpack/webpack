import fs from "fs";
import { isMain, readMain } from "./dep";

it("should answer import.meta.main statically in a concatenated inner module", () => {
	expect(isMain).toBe(false);
	expect(readMain()).toBe(false);
});

it("should scope-hoist a module that only reads import.meta.main", () => {
	const bundle = fs.readFileSync(__filename, "utf-8");
	// spelled in parts so this assertion is not itself a match
	expect(bundle).not.toContain(`${"__webpack_require__"}.c[`);
});
