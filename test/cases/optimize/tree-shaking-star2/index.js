import { aa } from "./root";
import { aa as aa2, d } from "./root3";
var root6 = require("./root6");

it("should correctly tree shake star exports", function() {
	expect(aa).toEqual("aa");
	expect(aa2).toEqual("aa");
	expect(d).toEqual("d");
	expect(root6).toEqual({
		aa: "aa",
		c: "c"
	});
});
