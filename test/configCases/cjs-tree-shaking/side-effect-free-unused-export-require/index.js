import { NodeSDK } from "./sdk-node.cjs";

export const sdk = new NodeSDK();

// `tracing` is never imported, so the `require("./utility.cjs")` behind it
// references no export while the module is still required and evaluated.
it("keeps a self-referenced export behind an unused cjs re-export", () => {
	expect(sdk).toBeInstanceOf(NodeSDK);
	const src = String(__webpack_modules__["./utility.cjs"]);
	expect(src).toMatch(/exports\.DEFAULT_LIMIT = 128;/);
	expect(src).toMatch(/__webpack_unused_export__ = function getLimit/);
});
