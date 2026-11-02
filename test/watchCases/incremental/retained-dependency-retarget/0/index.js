import { answer } from "./barrel.js";

it("should resolve the original request", () => {
	expect(answer).toBe("first");
});
