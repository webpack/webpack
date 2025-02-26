/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /button.js$/,
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
				test: /index.js$/,
				include: (resource, { descriptionData, relativePath }) =>
					descriptionData && descriptionData.name === "fake-package",
				loader: "./loader",
				options: {
					value: "matched-by-package"
				}
			},
			{
				test: /excluded.js$/,
				exclude: (resource, { descriptionData, relativePath }) =>
					descriptionData &&
					descriptionData.name === "fake-package" &&
					descriptionData.version === "1.0.0" &&
					relativePath === "./lib/excluded.js",
				loader: "./loader",
				options: {
					value: "matched-by-excluded"
				}
			},
			{
				test: /test.js$/,
				use: ({ descriptionData, relativePath }) => {
					if (
						descriptionData &&
						descriptionData.name === "fake-package" &&
						descriptionData.version === "1.0.0" &&
						relativePath === "./lib/test.js"
					) {
						return {
							loader: "./loader",
							options: {
								value: "matched-by-test"
							}
						};
					}
					return null;
				}
			}
		]
	}
};
