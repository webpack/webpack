import * as c from "../data/c.json";
import * as d from "../data/d.json";
import { bb, aa } from "../data/e.json";
import f, { named } from "../data/f.json";
import g, { named as gnamed } from "../data/g.json";

it("should be possible to import json data", function() {
	c[2].should.be.eql(3);
	Object.keys(d).should.be.eql(["default"]);
	aa.should.be.eql(1);
	bb.should.be.eql(2);
	named.should.be.eql("named");
	({ f }).should.be.eql({
		f: {
			__esModule: true,
			default: "default",
			named: "named"
		}
	});
	g.named.should.be.equal(gnamed);
});
