import { exportUsed, export2Used } from "./inner";
import { f1 } from "./module";

it("export should be unused when only unused functions use it", () => {
	f1();
	if (process.env.NODE_ENV === "production") {
		expect(exportUsed).toBe(false);
		expect(export2Used).toBe(true);
	}
	return import("./chunk");
});
