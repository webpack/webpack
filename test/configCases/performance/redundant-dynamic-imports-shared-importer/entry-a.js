import { target } from "./target";
import { load } from "./mid";

it("should carry the target up front in this entry", () => {
	expect(target).toBe(1);
	return load().then((module) => {
		expect(module.target).toBe(1);
	});
});
