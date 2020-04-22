var DelegatedPlugin = require("../../../../").DelegatedPlugin;
/** @type {import("../../../../").Configuration} */
module.exports = {
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
		})
	]
};
