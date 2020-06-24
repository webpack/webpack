import {val} from "./module";

it("should accept changes", (done) => {
	expect(val).toBe(1);
	NEXT(require("../../update")(done));
	done();
});
