const ContainerReferencePlugin = require("../../../../lib/container/ContainerReferencePlugin");

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
