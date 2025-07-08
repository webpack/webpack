/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	optimization: {
		concatenateModules: true
	},
	experiments: {
		deferImport: true
	}
};
