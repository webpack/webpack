import lost from "./lost";
import kept from "./kept";
import plain from "./plain";

it("should report the missing map as an error", () => {
	expect(lost).toBe(1);
	expect(kept).toBe(2);
	expect(plain).toBe(3);
});
