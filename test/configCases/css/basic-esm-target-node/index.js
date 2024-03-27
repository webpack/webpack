import * as style from "./style.css";

it("should compile and load style on demand", done => {
	expect(style).toEqual(nsObj({}));
	import("./style2.css").then(x => {
		expect(x).toEqual(nsObj({}));
		done();
	}, done);
});
