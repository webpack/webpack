import { load } from "./mid";

it("should still defer the target in this entry", () => {
	expect(__STATS__.hints).toHaveLength(0);
	return load().then((module) => {
		expect(module.target).toBe(1);
	});
});
