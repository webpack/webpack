import { test } from "./a";

it("should correctly tree shake star exports", function() {
	expect(test).toBe(123);
});
