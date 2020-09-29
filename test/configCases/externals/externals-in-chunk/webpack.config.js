/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		external: "1+2",
		external2: "3+4",
		external3: "5+6"
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
