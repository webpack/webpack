import i18n from "./i18n.js";
import { used } from "./wtf.js";
import { parse } from "acorn";
import fs from "fs";

const __ = i18n.__;

function xyz() {
	used();
	__("abc");
}
xyz();

it("Should keep top-level `__` variable name in the entry module", () => {
	const bundle = fs.readFileSync(__filename, "utf-8");

	const ast = parse(bundle, {
		sourceType: "module",
		ecmaVersion: "latest"
	});

	expect(
		ast.body.some(
			(node) =>
				node.type === "VariableDeclaration" &&
				node.declarations.some(
					(declaration) =>
						declaration.id.type === "Identifier" && declaration.id.name === "__"
				)
		)
	).toBe(true);
});
