import value, { self as moduleSelf } from "./module";
export var self = require("./");

it("should have the correct values", function() {
	value.should.be.eql("default");
	moduleSelf.should.be.eql(self);
	self.self.should.be.eql(self);
});
