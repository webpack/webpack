import { shared } from "./shared";

it("should warn about an 'import()' whose module is already initial", () => {
	expect(shared).toBe(1);

	return import("./shared").then((module) => {
		expect(module.shared).toBe(1);
	});
});
