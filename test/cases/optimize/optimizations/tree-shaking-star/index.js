import { test } from "./a";
import { func1, func3 } from "./x";

it("tree-shaking-star: should correctly tree shake star exports", function() {
	expect(test).toBe(123);
	expect(func1()).toBe("func1");
	expect(func3()).toBe("func3");
});
