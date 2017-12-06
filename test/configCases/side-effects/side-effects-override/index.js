import { log as plog } from "pmodule/tracker";
import { log as nlog } from "nmodule/tracker";
import p from "pmodule";
import n from "nmodule";

it("should be able to override side effects", function() {
	p.should.be.eql("def");
	n.should.be.eql("def");
	plog.should.be.eql(["a.js", "b.js", "c.js", "index.js"]);
	nlog.should.be.eql(["index.js"]);
});
