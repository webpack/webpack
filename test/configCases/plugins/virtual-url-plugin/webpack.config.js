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
				type: ".svg",
				source() {
					return fs.readFileSync(path.join(__dirname, "./file.svg"));
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
				type: "asset/resource",
				generator: {
					filename: "[name][ext]"
				}
			}
		]
	}
};

module.exports = config;
