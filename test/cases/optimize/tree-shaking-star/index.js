import { test } from "./a";
import { func1, func3 } from "./x";

it("should correctly tree shake star exports", function() {
	expect(test).toEqual(123);
	expect(func1()).toEqual("func1");
	expect(func3()).toEqual("func3");
});
