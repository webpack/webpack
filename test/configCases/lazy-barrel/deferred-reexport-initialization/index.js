import { other } from "./barrel.js";

it("should keep imports a barrel needs once a deferred reexport is requested", () => {
	expect(other).toBe(3);
	return import("./later.js").then(({ read }) => {
		expect(read()).toBe(1);
	});
});
