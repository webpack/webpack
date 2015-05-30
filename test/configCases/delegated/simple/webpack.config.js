var DelegatedPlugin = require("../../../../lib/DelegatedPlugin");
module.exports = {
	plugins: [
		new DelegatedPlugin({
			source: "./bundle",
			type: "require",
			context: __dirname,
			content: {
				"./a.js": 0,
				"./loader.js!./b.js": 1,
				"./dir/c.js": 2
			}
		})
	]
};
