import a from "../data/a.json";
import b from "../data/b.json";
import c from "../data/c.json";
import d from "../data/d.json";
import e from "../data/e.json";
import f from "../data/f.json";

it("should be possible to import json data", function() {
	({a}).should.be.eql({a: null});
	b.should.be.eql(123);
	c.should.be.eql([1, 2, 3, 4]);
	d.should.be.eql({});
	e.should.be.eql({
		aa: 1,
		bb: 2,
		"1": "x"
	});
	f.should.be.eql({
		named: "named",
		"default": "default",
		__esModule: true
	});
});
