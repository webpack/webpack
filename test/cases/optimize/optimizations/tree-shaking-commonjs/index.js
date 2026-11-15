import { test } from "./a";

it("tree-shaking-commonjs: should correctly tree shake star exports", function() {
	expect(test).toBe(123);
});
