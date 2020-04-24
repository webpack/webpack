const foo = require("foo");

require('./global');

it("should use browser main field", () => {
	expect(foo).toBe("browser");
});
