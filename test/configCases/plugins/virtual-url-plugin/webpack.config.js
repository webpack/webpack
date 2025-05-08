const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const { VirtualUrlPlugin } = webpack.experiments.schemes;

const watchDir = path.join(__dirname, "./routes");
const virtualModuleId = "virtual:routes";

/** @type {import('webpack').Configuration} */
const config = {
	plugins: [
		new VirtualUrlPlugin({
			source(id, loaderContext) {
				if (id === virtualModuleId) {
					const files = fs.readdirSync(watchDir);

					return `
            export const routes = {
              ${files.map(key => `${key.split(".")[0]}: () => import('./routes/${key}')`).join(",\n")}
            }        
          `;
				}
				throw new Error(`Unknown virtual module: ${id}`);
			}
		})
	]
};

module.exports = config;
