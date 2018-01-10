it("should parse patterns in for in/of statements", () => {
	var message;
	for({ message = require("./module")} of [{}]) {
		message.should.be.eql("ok");
	}
	for({ message = require("./module") } in { "string": "value" }) {
		message.should.be.eql("ok");
	}
	for(var { value = require("./module")} of [{}]) {
		value.should.be.eql("ok");
	}
	for(var { value = require("./module") } in { "string": "value" }) {
		value.should.be.eql("ok");
	}
});
