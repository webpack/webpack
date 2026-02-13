"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;

const watchDir = path.join(__dirname, "./routes");

/** @type {import("webpack").Configuration} */
const config = {
	plugins: [
		new VirtualUrlPlugin({
			routes() {
				const files = fs.readdirSync(watchDir);
				return `
					export const routes = {
						${files.map((key) => `${key.split(".")[0]}: () => import('./routes/${key}')`).join(",\n")}
					}
				`;
			},
			app: "export const app = 'app'",
			config: {
				type: ".json",
				source() {
					return '{"name": "virtual-url-plugin"}';
				}
			},
			ts: {
				type: ".ts",
				source() {
					return `interface Info {
						name: string;
					}
					export const ts = 'const';`;
				}
			},
			"hello.ts": "export const hello = 'hello';",
			style: {
				type: ".css",
				source() {
					return "body{background-color: powderblue;}";
				}
			},
			txt: {
				type: ".txt",
				source() {
					return "Hello world";
				}
			},
			"hammer.svg": {
				context: "",
				type: ".svg",
				source() {
					return fs.readFileSync(path.join(__dirname, "./file.svg"));
				}
			},
			"src/components/button.js":
				"import { trim } from './utils';export const button = trim('button ');",
			"src/components/table.js": {
				context: path.join(__dirname, "./src/components"),
				source() {
					return "import { trim } from './utils';export const table = trim('table ');";
				}
			},
			"src/components/icon.js": {
				context: "auto",
				source() {
					return "import { trim } from './utils';export const icon = trim('icon ');";
				}
			}
		})
	],
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.ts/,
				use: [
					{
						loader: require.resolve("./ts-loader.js")
					},
					{
						loader: require.resolve("./babel-loader.js")
					}
				]
			},
			{
				test: /\.txt/,
				type: "asset/source"
			},
			{
				test: /\.svg/,
				type: "asset/resource"
			}
		]
	},
	output: {
		assetModuleFilename: ({ filename: _filename }) => {
			const filename = /** @type {string} */ (_filename);
			return filename.replace("virtual:", "");
		}
	}
};

module.exports = config;
