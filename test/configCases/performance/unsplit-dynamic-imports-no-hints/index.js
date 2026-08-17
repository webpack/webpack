import { shared } from "./shared";

it("should report nothing while hints are off", () => {
	expect(shared).toBe(1);

	return import("./shared").then(() => {
		expect(__STATS__.hints).toHaveLength(0);
	});
});
