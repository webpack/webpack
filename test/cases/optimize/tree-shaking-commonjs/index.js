import { test } from "./a";

it("should correctly tree shake star exports", function() {
	expect(test).toEqual(123);
});
