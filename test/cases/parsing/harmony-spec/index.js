import { value, add } from "./live";
import { value as value2, add as add2 } from "./live-es5";
import { getLog } from "./order-tracker";
import "./order-c";
import cycleValue from "./export-cycle-a";
import { data } from "./self-cycle";

it("should establish live binding of values", function() {
	value.should.be.eql(0);
	add(2);
	value.should.be.eql(2);
});

it("should establish live binding of values with transpiled es5 module", function() {
	value2.should.be.eql(0);
	add2(5);
	value2.should.be.eql(5);
});

it("should allow to use eval with exports", function() {
	valueEval.should.be.eql(0);
	evalInModule("value = 5");
	valueEval.should.be.eql(5);
});

it("should execute modules in the correct order", function() {
	getLog().should.be.eql(["a", "b", "c"]);
});

it("should bind exports before the module executes", function() {
	cycleValue.should.be.eql(true);
});

it("should allow to import live variables from itself", function() {
	data.should.be.eql([undefined, 1, 2]);
});

import { value as valueEval, evalInModule } from "./eval";
