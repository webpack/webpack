var { ProvidePlugin } = require("../../../../");
module.exports = {
	plugins: [
		new ProvidePlugin({
			aaa: "aaa"
		})
	]
};
