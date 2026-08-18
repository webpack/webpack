import { value } from "./dep";

it("should stay silent when every module can be read", () => {
	expect(value).toBe(7);
	expect(__STATS__.hints).toHaveLength(0);
});
