import { basename } from "path";
import { fileURLToPath } from "url";

// Under Deno a bare `import "path"` throws unless webpack rewrote it to the
// required `node:path` specifier, so a passing test proves the prefix is added.
it("should load node.js built-ins through the node: specifier", () => {
	expect(basename("/foo/bar/baz.js")).toBe("baz.js");
	expect(typeof fileURLToPath).toBe("function");
});
