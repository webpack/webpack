const foo = require("foo");

it("should use browser main field", () => {
	foo.should.be.eql("browser");
});
