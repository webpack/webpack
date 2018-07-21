import X, { A, B } from "./module";

it("should parse classes", function() {
	new X().a.should.be.eql("ok");
	new A().a.should.be.eql("ok");
	new B().a.should.be.eql("ok");
});
