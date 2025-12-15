import * as styles from "./style.module.css";

it("should allow to disable options", () => {
	expect(styles).toMatchSnapshot("options classes");

	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const cssOutputFilename = `bundle6.css`;

	const cssContent = fs.readFileSync(
		path.join(__dirname, cssOutputFilename),
		"utf-8"
	);
	expect(cssContent).toMatchSnapshot("options css");
});
