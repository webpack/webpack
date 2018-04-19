it("should not deadlock when using loadModule", () => {
	const result = require("./loader!");
	result.should.match(/console.log\(42\)/);
});
