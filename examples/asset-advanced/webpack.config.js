module.exports = {
	output: {
		assetModuleFilename: "images/[hash][ext]"
	},
	module: {
		rules: [
			{
				test: /\.(png|jpg|svg)$/,
				type: "asset",
				generator: {
					dataUrl: content => {
						if (typeof content !== "string") {
							content = content.toString();
						}

						// just like in svg-url-loader https://github.com/bhovhannes/svg-url-loader/blob/e5ef4445f2fbb6f85245d8a6c88e2ea9a4377357/src/loader.js#L38-L44
						const REGEX_DOUBLE_QUOTE = /"/g;
						const REGEX_MULTIPLE_SPACES = /\s+/g;
						const REGEX_UNSAFE_CHARS = /[{}|\\^~[\]`"<>#%]/g;

						content = content.replace(REGEX_DOUBLE_QUOTE, "'");
						content = content.replace(REGEX_MULTIPLE_SPACES, " ");
						content = content.replace(
							REGEX_UNSAFE_CHARS,
							match =>
								"%" +
								match[0]
									.charCodeAt(0)
									.toString(16)
									.toUpperCase()
						);

						return "data:image/svg+xml," + content.trim();
					}
				}
			}
		]
	},
	experiments: {
		asset: true
	}
};
