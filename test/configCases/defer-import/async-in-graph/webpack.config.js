/** @type {import("../../../../").Configuration} */
module.exports = {
	target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
	mode: "none",
	experiments: {
		topLevelAwait: true,
		deferImport: true
	}
};
