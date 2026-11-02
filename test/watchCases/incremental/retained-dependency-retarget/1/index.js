import { answer } from "./barrel.js";

it("should resolve the request changed by stillValidModule", () => {
	expect(answer).toBe("second");
});
