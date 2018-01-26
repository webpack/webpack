import value, { exception } from "./module";

it("should have a TDZ for exported const values", function() {
	expect((typeof exception)).toBe("object");
	exception.should.be.instanceof(Error);
	exception.message.should.match(/ is not defined$/);
	expect(value).toBe("value");
});
