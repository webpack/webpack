import { getSecond } from "./second-dep.js";

const secondValue = getSecond();

it("the second concatenated entry shares scope without collisions", () => {
	expect(secondValue).toBe("second");
});
