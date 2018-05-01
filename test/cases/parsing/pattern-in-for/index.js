it("should parse patterns in for in/of statements", () => {
	var message;
	for({ message = require("./module")} of [{}]) {
		expect(message).toBe("ok");
	}
	for({ message = require("./module") } in { "string": "value" }) {
		expect(message).toBe("ok");
	}
	for(var { value = require("./module")} of [{}]) {
		expect(value).toBe("ok");
	}
	for(var { value = require("./module") } in { "string": "value" }) {
		expect(value).toBe("ok");
	}
});
