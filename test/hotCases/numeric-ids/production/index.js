import { value } from "./file";

it("should auto-import an ES6 imported value on accept", function(done) {
	expect(value).toBe(1);
	module.hot.accept("./file", function() {
		expect(value).toBe(2);
		outside();
		done();
	});
	NEXT(require("../../update")(done));
});

function outside() {
	expect(value).toBe(2);
}
