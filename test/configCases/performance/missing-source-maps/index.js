import lost from "./lost";
import kept from "./kept";
import plain from "./plain";

it("should report a loader that returned no source map", () => {
	expect(lost).toBe(1);
	expect(kept).toBe(2);
	expect(plain).toBe(3);
});
