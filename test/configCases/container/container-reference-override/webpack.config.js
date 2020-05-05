const { ContainerReferencePlugin } = require("../../../../").container;

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ContainerReferencePlugin({
			remoteType: "var",
			remotes: {
				abc: "ABC"
			},
			overrides: {
				test: "./new-test"
			}
		})
	]
};
