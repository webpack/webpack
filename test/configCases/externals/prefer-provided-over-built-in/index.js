import http from "http";

it("prefer provided over built-in", () => {
	expect(http).toBe(3);
});
