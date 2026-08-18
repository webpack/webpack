import { value } from "./dep";

it("should stay silent when everything was hoisted", () => {
	expect(value).toBe(42);
	expect(__STATS__.hints).toHaveLength(0);
});
