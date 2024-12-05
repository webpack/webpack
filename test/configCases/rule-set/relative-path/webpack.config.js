/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.js$/,
				include: (resource, { descriptionData, relativePath }) =>
					descriptionData &&
					descriptionData.name === "fake-package" &&
					descriptionData.version === "1.0.0" &&
					relativePath === "./lib/button.js",
				loader: "./loader",
				options: {
					value: "matched-by-relative-path"
				}
			},
			{
				test: /\.js$/,
				include: (resource, { descriptionData, relativePath }) =>
					descriptionData && descriptionData.name === "fake-package",
				loader: "./loader",
				options: {
					value: "matched-by-package"
				}
			}
		]
	}
};
