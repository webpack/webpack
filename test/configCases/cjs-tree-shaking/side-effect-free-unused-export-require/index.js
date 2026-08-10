import { NodeSDK } from "./sdk-node.cjs";

export const sdk = new NodeSDK();

// `tracing` is never imported; the side-effect-free reexport target is dropped.
it("drops a side-effect-free module behind an unused cjs re-export", () => {
	expect(sdk).toBeInstanceOf(NodeSDK);
	expect("./utility.cjs" in __webpack_modules__).toBe(false);
	expect(String(__webpack_modules__["./sdk-node.cjs"])).toMatch(
		/\/\* unused reexport \*\/ 0/
	);
});
