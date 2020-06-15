// eslint-disable-next-line node/no-unpublished-require
const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ConsumeSharedPlugin({
			consumes: {
				shared: {
					import: false,
					strictVersion: true
				},
				shared2: {
					import: false
				}
			}
		})
	]
};
