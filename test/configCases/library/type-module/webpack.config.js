/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node16",
	output: {
		library: {
			type: "module"
		}
	},
	experiments: {
		outputModule: true
	}
};
