import * as barrel from "./barrel.js";
import * as styles from "./style.module.css";

it("should compile with css accept and lazy barrel re-exports", function (done) {
	expect(styles).toMatchObject({
		class: "accept-split-chunks-style_module_css-class"
	});
	expect(barrel.helper()).toBe("helper");

	module.hot.accept(["./style.module.css", "./style2.module.css"], () => {
		expect(styles).toMatchObject({
			"class-other": "accept-split-chunks-style_module_css-class-other"
		});
		done();
	});

	NEXT(require("../../update")(done));
});
