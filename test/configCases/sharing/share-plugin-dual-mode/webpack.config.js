// eslint-disable-next-line n/no-unpublished-require
const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	context: `${__dirname}/cjs`,
	plugins: [
		new SharePlugin({
			shared: {
				lib: {},
				transitive_lib: {}
			}
		})
	]
};
