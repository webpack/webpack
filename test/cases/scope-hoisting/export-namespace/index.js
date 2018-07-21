import { ns as ns1 } from "./module1";
const ns2 = require("./module2").ns;

it("should allow to export a namespace object (concated)", function() {
	ns1.should.be.eql({
		a: "a",
		b: "b"
	});
});

it("should allow to export a namespace object (exposed)", function() {
	ns2.should.be.eql({
		a: "a",
		b: "b"
	});
});
