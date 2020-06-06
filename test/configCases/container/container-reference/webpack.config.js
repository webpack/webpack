const { ContainerReferencePlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: {
				abc: "ABC",
				def: "DEF"
			}
		})
	]
};
