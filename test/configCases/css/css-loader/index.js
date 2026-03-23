import * as styles from "./classes.module.css";
import * as styles1 from "./composes-multiple.module.css";
import * as styles3 from "./composes-global.module.css";
import * as styles4 from "./scope-at-rule.module.css";
import * as styles5 from "./nesting.module.css";
import * as styles6 from "./prefer-relative.module.css";

it("should work", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(styles).toMatchSnapshot();
	expect(styles1).toMatchSnapshot();
	expect(styles3).toMatchSnapshot();
	expect(styles4).toMatchSnapshot();
	expect(styles5).toMatchSnapshot();
	expect(styles6).toMatchSnapshot();
	expect(css).toMatchSnapshot();
});
