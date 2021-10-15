const ConstDependency = require("../../../../").dependencies.ConstDependency;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		// Define used props
		compiler => {
			compiler.hooks.thisCompilation.tap(
				"DefineUsed",
				(compilation, { normalModuleFactory }) => {
					normalModuleFactory.hooks.parser
						.for("javascript/auto")
						.tap("DefineUsed", parser => {
							const used = {};

							const toConstExpression = jsonOrFn => expression => {
								const dep = new ConstDependency(
									`Object(${JSON.stringify(
										typeof jsonOrFn === "function" ? jsonOrFn() : jsonOrFn
									)})`,
									expression.range
								);
								dep.loc = expression.loc;
								parser.state.module.addPresentationalDependency(dep);
							};

							const defineUsed = definedProp => () => {
								const usedProps = parser.getUsedPropertiesIfAny() || null;
								used[definedProp] = usedProps;

								if (usedProps === null) return {};

								return usedProps.reduce((acc, prop) => {
									acc[prop] = 0;
									return acc;
								}, {});
							};

							["a", "b", "c", "d"].forEach(prop => {
								parser.hooks.expression
									.for(`_DEFINE_.${prop}`)
									.tap("DefineUsed", toConstExpression(defineUsed(prop)));
							});
							parser.hooks.expression
								.for("_USED_")
								.tap("DefineUsed", toConstExpression(used));
						});
				}
			);
		}
	]
};
