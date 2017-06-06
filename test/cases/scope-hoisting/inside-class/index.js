import { Foo, Bar as FirstBar } from "./first"
import { Foo as SecondFoo, Bar } from "./second"

it("should renamed class reference in inner scope", function() {
	var a = new Foo().test();
	var b = new SecondFoo().test();
	a.should.be.eql(1);
	b.should.be.eql(2);
	new FirstBar().test().should.be.eql(1);
	new Bar().test().should.be.eql(2);
});
