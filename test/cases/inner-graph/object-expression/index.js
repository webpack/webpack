import { o2, o3 } from "./module";

import {
	exportUsed,
	export2Used,
	export3Used,
	export4Used,
	export5Used,
	export6Used
} from "./inner";

it("some exports should be unused when no object expression use it", () => {
	expect(o2.EXPORT4).toBe(42);
	expect(o3.EXPORT5()).toBe(42);
	expect(o3.EXPORT6()).toBe(42);
	if (process.env.NODE_ENV === "production") {
		expect(exportUsed).toBe(false);
		expect(export2Used).toBe(false);
		expect(export3Used).toBe(false);
		expect(export4Used).toBe(true);
		expect(export5Used).toBe(true);
		expect(export6Used).toBe(true);
	}
});
