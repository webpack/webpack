import { log as plog } from "pmodule/tracker";
import { log as plog2 } from "pmodule2/tracker";
import p from "pmodule";
import p2 from "pmodule2";

it("should understand variations of `false`", function() {
	p.should.be.eql("def");
	p2.should.be.eql("def");
	plog.should.be.eql(["index.js"]);
	plog2.should.be.eql(["index.js"]);
});
