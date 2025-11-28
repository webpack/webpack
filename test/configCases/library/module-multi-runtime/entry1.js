import { foo } from "./cjs-concat";

it("should generate correct export definition / 1", function () {
	expect(foo).toBe("foo")
});
