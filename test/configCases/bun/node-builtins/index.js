import { basename } from "path";
import { fileURLToPath } from "url";

// Bun keeps node.js built-ins external; webpack rewrites the bare specifier to
// the `node:` form, which Bun (and Node, via the esm runner) both resolve.
it("should load node.js built-ins through the node: specifier", () => {
	expect(basename("/foo/bar/baz.js")).toBe("baz.js");
	expect(typeof fileURLToPath).toBe("function");
});
