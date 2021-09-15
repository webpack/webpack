var DelegatedPlugin = require("../../../../").DelegatedPlugin;
/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		moduleIds: "hashed"
	},
	plugins: [
		new DelegatedPlugin({
			source: "./bundle",
			type: "require",
			context: __dirname,
			content: {
				"./a.js": {
					id: 0
				},
				"./loader.js!./b.js": {
					id: 1
				},
				"./dir/c.js": {
					id: 2
				}
			}
		}),
		new DelegatedPlugin({
			source: "./bundle2",
			type: "object",
			context: __dirname,
			content: {
				"./d.js": {
					id: 3
				},
				"./e.js": {
					id: 4
				}
			}
		})
	]
};
