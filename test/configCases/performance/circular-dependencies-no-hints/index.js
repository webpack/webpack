import { a } from "./a";

it("should report nothing while hints are off", () => {
	expect(a()).toBe(1);
	expect(__STATS__.hints).toHaveLength(0);
});
