import { getFirst } from "./first-dep.js";

const firstValue = getFirst();

it("the first concatenated entry runs in the shared startup scope", () => {
	expect(firstValue).toBe("first");
});
