const ContainerPlugin = require("../../../../lib/container/ContainerPlugin");

module.exports = {
	plugins: [
		new ContainerPlugin({
			name: "container",
			filename: "container-file.js",
			library: {
				type: "commonjs-module"
			},
			exposes: {
				test: "./test"
			},
			overridables: {
				value: "./value"
			}
		})
	]
};
