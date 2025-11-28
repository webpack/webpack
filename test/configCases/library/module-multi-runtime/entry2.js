import { bar } from "./cjs-concat";

it("should generate correct export definition / 2", function () {
	expect(bar).toBe("bar")
});
