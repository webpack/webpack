const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ProvideSharedPlugin({
			shareScope: "test-scope",
			provides: [
				{
					test1: "./test1",
					test2: {
						import: "./test2-wrong",
						shareScope: "other-scope",
						version: "1.2.3"
					}
				},
				"package"
			]
		}),
		new ProvideSharedPlugin({
			provides: ["package"]
		}),
		new ProvideSharedPlugin({
			shareScope: "other-scope",
			provides: {
				test2: {
					import: "./test2",
					version: [1, 3, 0]
				}
			}
		}),
		new ProvideSharedPlugin({
			provides: {
				test2: {
					import: "./test2-wrong",
					shareScope: "other-scope",
					version: [1, 1, 9]
				}
			}
		})
	]
};
