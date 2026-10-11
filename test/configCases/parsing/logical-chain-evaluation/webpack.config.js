"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{},
	{ hookType: "Identifier" },
	{ hookType: "Identifier", intercept: true },
	{ hookType: "MemberExpression" },
	{ hookType: "MemberExpression", intercept: true },
	{ hookType: "LogicalExpression" },
	{ hookType: "LogicalExpression", intercept: true },
	{ hookType: "walk" },
	{ hookType: "walk", intercept: true }
].map(({ hookType, intercept }) => ({
	optimization: { minimize: false },
	module: {
		rules: [{ test: /chain\.js$/, loader: require.resolve("./loader") }]
	},
	plugins: [
		new DefinePlugin({
			EVALUATION_PLUGIN: JSON.stringify(intercept ? "none" : hookType || "none")
		}),
		{
			apply(compiler) {
				compiler.hooks.compilation.tap(
					"CountLogicalEvaluationsPlugin",
					(compilation, { normalModuleFactory }) => {
						normalModuleFactory.hooks.parser
							.for("javascript/auto")
							.tap("CountLogicalEvaluationsPlugin", (parser) => {
								const evaluate = parser.evaluateExpression;
								let evaluations = 0;
								let hookCalls = 0;
								if (hookType) {
									const hook =
										hookType === "walk"
											? parser.hooks.expressionLogicalOperator
											: parser.hooks.evaluate.for(hookType);
									if (intercept) {
										hook.intercept({
											call() {
												hookCalls++;
											}
										});
									} else {
										hook.tap(
											{ name: "ObserveLogicalChainPlugin", stage: -100 },
											() => {
												hookCalls++;
											}
										);
									}
									if (!intercept && hookType !== "walk") {
										parser.hooks.evaluate
											.for(hookType)
											.tap(
												{ name: "EvaluateLocalPlugin", stage: -100 },
												(expression) => {
													if (
														(expression.type === "Identifier" &&
															expression.name === "pluginValue") ||
														(expression.type === "MemberExpression" &&
															expression.property.type === "Identifier" &&
															expression.property.name === "pluginValue") ||
														(expression.type === "LogicalExpression" &&
															expression.left.type === "Identifier" &&
															expression.left.name === "pluginLogicalValue")
													) {
														return parser.evaluateExpression({
															type: "Literal",
															value: false,
															range: expression.range
														});
													}
												}
											);
									}
								}
								parser.hooks.program.tap(
									"CountLogicalEvaluationsPlugin",
									() => {
										evaluations = hookCalls = 0;
									}
								);
								parser.evaluateExpression = (expression) => {
									evaluations++;
									return evaluate.call(parser, expression);
								};
								parser.hooks.finish.tap("CountLogicalEvaluationsPlugin", () => {
									const match = /chain\.js\?(?:and|or)-(\d+)$/.exec(
										parser.state.module.resource
									);
									if (!match) return;
									if (hookType) {
										expect(hookCalls).toBeGreaterThan(0);
										expect(evaluations).toBeGreaterThan(Number(match[1]) * 3);
									} else {
										expect(evaluations).toBeLessThanOrEqual(
											Number(match[1]) * 3
										);
									}
								});
							});
					}
				);
			}
		}
	]
}));
