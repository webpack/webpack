const path = require("path");
const NormalModule = require("../../../../").NormalModule;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset",
				parser: {
					dataUrlCondition: (source, { filename, module }) => {
						expect(source).toBeInstanceOf(Buffer);
						expect(filename).toBe(
							path.resolve(__dirname, "../_images/file.png")
						);
						expect(module).toBeInstanceOf(NormalModule);
						return true;
					}
				}
			},
			{
				test: /\.jpg$/,
				type: "asset",
				parser: {
					dataUrlCondition: (source, { filename, module }) => {
						expect(source).toBeInstanceOf(Buffer);
						expect(filename).toBe(
							path.resolve(__dirname, "../_images/file.jpg")
						);
						expect(module).toBeInstanceOf(NormalModule);
						return false;
					}
				}
			},
			{
				test: /\.svg$/,
				type: "asset",
				parser: {
					dataUrlCondition: {
						maxSize: 0
					}
				}
			}
		]
	}
};
