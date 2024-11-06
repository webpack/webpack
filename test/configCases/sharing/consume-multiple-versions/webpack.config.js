// eslint-disable-next-line n/no-unpublished-require
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
				},
				shared3: {
					import: false,
					strictVersion: true
				},
				shared4: {
					import: false
				},
				shared5: {
					import: false,
					strictVersion: true
				},
				shared6: {
					import: false,
					strictVersion: true
				},
				shared7: {
					import: false,
					strictVersion: true
				},
				shared8: {
					import: false,
					strictVersion: true
				},
				shared9: {
					import: false,
					strictVersion: true
				},
				shared10: {
					import: false,
					strictVersion: true
				},
				shared11: {
					import: false,
					strictVersion: true
				},
				shared12: {
					import: false
				},
				shared13: {
					import: false
				},
				shared14: {
					import: false
				},
				shared15: {
					import: false,
					strictVersion: true
				},
				shared16: {
					import: false
				},
				shared17: {
					import: false,
					strictVersion: true
				},
				shared18: {
					import: false
				},
				shared19: {
					import: false
				},
				shared20: {
					import: false
				},
				shared21: {
					import: false
				},
				shared22: {
					import: false
				},
				shared23: {
					import: false
				},
				shared24: {
					import: false
				}
			}
		})
	]
};
