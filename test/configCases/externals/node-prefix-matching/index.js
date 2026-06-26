// `node:`-prefixed and bare core module requests resolve to the same external
// regardless of which form the developer keyed in `externals`. A mismatch would
// fail the build (unresolved request / unhandled scheme) before this runs.
const bareFs = require("fs");
const prefixedFs = require("node:fs");
const barePath = require("path");
const prefixedPath = require("node:path");

it("should match a `node:` import against a bare external and vice versa", () => {
	expect(typeof bareFs.readFileSync).toBe("function");
	expect(typeof prefixedFs.readFileSync).toBe("function");
	expect(typeof barePath.join).toBe("function");
	expect(typeof prefixedPath.join).toBe("function");
});
