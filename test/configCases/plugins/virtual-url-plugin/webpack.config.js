const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");
const { VirtualUrlPlugin } = webpack.experiments.schemes;

const watchDir = path.join(__dirname, "./routes");

/** @type {import('webpack').Configuration} */
const config = {
	plugins: [
		new VirtualUrlPlugin({
			routes(loaderContext) {
				const files = fs.readdirSync(watchDir);
				return `
					export const routes = {
						${files.map(key => `${key.split(".")[0]}: () => import('./routes/${key}')`).join(",\n")}
					}        
				`;
			},
			app: "export const app = 'app'",
			config: {
				type: ".json",
				source() {
					return `{"name": "virtual-url-plugin"}`;
				}
			},
			style: {
				type: ".css",
				source() {
					return `body{background-color: powderblue;}`;
				}
			}
		})
	],
	experiments: {
		css: true
	}
};

module.exports = config;
