import * as style from "./style.css";

it("should compile and load style on demand", done => {
	expect(style).toMatchSnapshot();
	import("./style2.css").then(x => {
		expect(x).toMatchSnapshot();
		done();
	}, done);
});
