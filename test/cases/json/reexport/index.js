import { e, f } from "./reexport";
import { e as e2, f as f2 } from "./reexport?1";

import("./reexport?1");

it("should be possible to reexport json data", function() {
	expect(e.aa).toBe(1);
	expect(e.bb).toBe(2);
	expect(f).toEqual({
		named: "named",
		default: "default",
		__esModule: true
	});
});
