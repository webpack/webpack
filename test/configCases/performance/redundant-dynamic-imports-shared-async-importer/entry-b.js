import { target } from "./target";

it("should carry the target up front in this entry", () => {
	expect(target).toBe(1);
	return import("./mid").then((module) =>
		module.load().then((loaded) => {
			expect(loaded.target).toBe(1);
		})
	);
});
