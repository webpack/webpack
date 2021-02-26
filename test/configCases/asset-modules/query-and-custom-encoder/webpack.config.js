const svgToMiniDataURI = require("mini-svg-data-uri");
const mimeTypes = require("mime-types");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg|jpg)$/,
				type: "asset/inline",
				generator: {
					dataUrl: (source, { filename, module }) => {
						if (filename.endsWith("?foo=bar")) {
							if (typeof source !== "string") {
								source = source.toString();
							}

							return svgToMiniDataURI(source);
						}

						const mimeType = mimeTypes.lookup(module.nameForCondition());
						const encodedContent = source.toString("base64");

						return `data:${mimeType};base64,${encodedContent}`;
					}
				}
			}
		]
	}
};
