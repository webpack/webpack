import * as composes from "./postcss-modules-extract-imports.modules.css";
import * as local from "./postcss-modules-local-by-default.local.modules.css";
import * as global from "./postcss-modules-local-by-default.global.modules.css";
import * as pure from "./postcss-modules-local-by-default.pure.modules.css";
import * as scope from "./postcss-modules-scope.modules.css";
import * as values from "./postcss-modules-values.modules.css";

it("should work", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(composes).toMatchSnapshot();
	expect(local).toMatchSnapshot();
	expect(global).toMatchSnapshot();
	expect(pure).toMatchSnapshot();
	expect(scope).toMatchSnapshot();
	expect(values).toMatchSnapshot();
	expect(css).toMatchSnapshot();
});
