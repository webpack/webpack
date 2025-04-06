import * as style from "./style.css";

it("should compile and load style on demand", done => {
	expect(style).toEqual({});
	import("./style2.css").then(x => {
		expect(x).toEqual({});
		done();
	}, done);
});
