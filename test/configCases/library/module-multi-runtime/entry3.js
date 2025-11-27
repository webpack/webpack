import { baz, concat } from "./cjs-concat";

it("should generate correct export definition / 3", function () {
	expect(baz).toBe("baz");
	expect(concat).toBe("concat~concat2");
});
