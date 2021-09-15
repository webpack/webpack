import { aa } from "./root";
import { aa as aa2, d } from "./root3";
var root6 = require("./root6");

it("should correctly tree shake star exports", function() {
	expect(aa).toBe("aa");
	expect(aa2).toBe("aa");
	expect(d).toBe("d");
	expect(root6).toEqual(nsObj({
		aa: "aa",
		c: "c"
	}));
});
