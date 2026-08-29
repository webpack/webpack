import { marker } from "./dep.js";

it("should report the unused specifier as an error in a strict harmony module", () => {
	expect(marker).toBe("strict");
});
