import { aa } from "./root";
import { aa as aa2, d } from "./root3";
var root6 = require("./root6");

it("should correctly tree shake star exports", function() {
	aa.should.be.eql("aa");
	aa2.should.be.eql("aa");
	d.should.be.eql("d");
	root6.should.be.eql({
		aa: "aa",
		c: "c"
	});
});
