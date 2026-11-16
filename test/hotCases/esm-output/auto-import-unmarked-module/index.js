import update from "../../update.esm";
import { value } from "./file";

it("should auto-import an ES6 imported value on accept", (done) => {
	expect(value).toBe(1);
	import.meta.webpackHot.accept("./file", () => {
		expect(value).toBe(2);
		done();
	});
	NEXT(update(done));
});
