import { value, add } from "./live";
import { getLog } from "./order-tracker";
import "./order-c";
import cycleValue from "./export-cycle-a";

it("should establish live binding of values", function() {
	value.should.be.eql(0);
	add(2);
	value.should.be.eql(2);
});

it("should execute modules in the correct order", function() {
	getLog().should.be.eql(["a", "b", "c"]);
});

it("should bind exports before the module executes", function() {
	cycleValue.should.be.eql(true);
});