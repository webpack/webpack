import source srcVar from "srcVar";
import source srcGlobal from "srcGlobal";

const isBrowser = typeof window !== "undefined";

it("runs source-phase imports of externals on both web and node", () => {
	expect(srcVar).toBe(3);
	expect(srcGlobal).toBe(globalThis);
	// same source-phase path is exercised under each platform of the universal build
	expect(typeof (isBrowser ? window : process)).toBe("object");
});
