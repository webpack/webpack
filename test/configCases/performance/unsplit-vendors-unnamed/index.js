import vendor from "vendor-lib";
import { shared } from "./shared";

it("should name a chunk nothing named by its id", () => {
	expect(vendor).toBe("vendor");
	expect(shared).toBe("shared");
});
