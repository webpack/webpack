// eslint-disable-next-line node/no-unpublished-require
const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ProvideSharedPlugin({
			shareScope: "test-scope",
			provides: [
				"./test1",
				{
					"./test2-wrong": {
						shareKey: "test2",
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
				"./test2": {
					shareKey: "test2",
					version: "1.3.0"
				}
			}
		}),
		new ProvideSharedPlugin({
			provides: {
				"./test2-wrong": {
					shareKey: "test2",
					shareScope: "other-scope",
					version: "1.1.9"
				}
			}
		})
	]
};
