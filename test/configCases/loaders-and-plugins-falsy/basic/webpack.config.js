var DefinePlugin = require("../../../../").DefinePlugin;

const nullValue = null;
const undefinedValue = undefined;
const falseValue = false;
const zeroValue = 0;
const emptyStringValue = "";

class FailPlugin {
	apply() {
		throw new Error("FailedPlugin");
	}
}

class TestChildCompilationPlugin {
	constructor(output) {}

	apply(compiler) {
		compiler.hooks.make.tapAsync(
			"TestChildCompilationFailurePlugin",
			(compilation, cb) => {
				const child = compilation.createChildCompiler(
					"name",
					compiler.outputOptions,
					[
						undefinedValue && new FailPlugin(),
						nullValue && new FailPlugin(),
						falseValue && new FailPlugin(),
						zeroValue && new FailPlugin(),
						emptyStringValue && new FailPlugin()
					]
				);

				child.runAsChild(cb);
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Will failed because we don't have unknown-loader
	module: {
		defaultRules: [
			nullValue && {
				test: /\.js$/,
				loader: "unknown-loader"
			},
			"..."
		],
		rules: [
			nullValue && {
				test: /\.js$/,
				loader: "unknown-loader"
			},
			{
				test: /foo\.js$/,
				oneOf: [
					nullValue && {
						resourceQuery: /inline/,
						loader: "unknown-loader"
					},
					{
						resourceQuery: /external/,
						type: "asset/resource"
					}
				]
			},
			{
				test: /bar\.js$/,
				use: [nullValue && "unknown-loader"]
			},
			{
				test: /baz\.js$/,
				resourceQuery: /custom-use/,
				use: () => [
					nullValue && {
						loader: "unknown-loader"
					}
				]
			},
			{
				test: /other\.js$/,
				rules: [
					nullValue && {
						loader: "unknown-loader"
					},
					{
						loader: "./loader.js"
					}
				]
			}
		]
	},
	resolve: {
		plugins: [undefinedValue && new FailPlugin()]
	},
	plugins: [
		new DefinePlugin({
			ONE: JSON.stringify("ONE")
		}),
		new TestChildCompilationPlugin(),
		undefinedValue && new FailPlugin(),
		nullValue && new FailPlugin(),
		falseValue && new FailPlugin(),
		zeroValue && new FailPlugin(),
		emptyStringValue && new FailPlugin()
	],
	optimization: {
		minimize: true,
		minimizer: [nullValue && new FailPlugin()]
	}
};
