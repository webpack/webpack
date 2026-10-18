import { namespace } from "./barrel.js";

it("should keep imports a barrel needs when a deferred reexport is requested", () => {
	expect(namespace.value).toBe(1);
});
