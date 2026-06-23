import { Database } from "bun:sqlite";
import { dlopen } from "bun:ffi";

// `bun:*` modules are provided by the Bun runtime; webpack must keep them
// external. If they were bundled, the build would fail to resolve them on disk,
// so a passing run proves they stayed external.
it("keeps bun's built-in modules external and resolvable", () => {
	expect(typeof Database).toBe("function");
	expect(typeof dlopen).toBe("function");
});
