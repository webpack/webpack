import { useCall } from "./lib";

it("should compile and run", () => {
	expect(useCall()).toBe(1);
});
