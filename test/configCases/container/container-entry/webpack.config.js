const ContainerPlugin = require("../../../../lib/container/ContainerPlugin");

module.exports = {
	plugins: [
		new ContainerPlugin({
			name: "container",
			filename: "container-file.js",
			libraryTarget: "commonjs",
			exposes: {
				test: "./test",
				test2: "./test2"
			}
		})
	]
};
