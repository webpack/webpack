const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const outputPath = options.output.path;
		const files = fs.readdirSync(outputPath);

		for (const file of files) {
			const filename = path.resolve(outputPath, file);
			const source = fs.readFileSync(filename, "utf-8");

			switch (file) {
				case "resource-with-bom.ext": {
					if (!/[\uFEFF]/.test(source)) {
						throw new Error(`Not found BOM in ${filename}.`);
					}
					break;
				}
				default: {
					if (/\uFEFF/.test(source)) {
						throw new Error(`Found BOM in ${filename}.`);
					}
				}
			}
		}
	}
};
