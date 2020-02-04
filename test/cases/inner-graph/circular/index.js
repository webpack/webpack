import { exportAUsed, exportBUsed, exportCUsed } from "./inner";
import { y } from "./module";

it("export should be unused when only unused functions use it", () => {
	expect(y("a")).toBe("okBAA");
	expect(exportAUsed).toBe(true);
	expect(exportBUsed).toBe(true);
	expect(exportCUsed).toBe(false);
	return import("./chunk");
});
