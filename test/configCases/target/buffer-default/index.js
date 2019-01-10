it("should provide a global Buffer shim", function () {
	expect(Buffer).toBeInstanceOf(Function);
});

it("should provide the buffer module", function () {
	var buffer = require("buffer");
	expect((typeof buffer)).toBe("object");
});
