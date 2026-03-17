"use strict";

const path = require("path");
const webpack = require("../../../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;

// The virtual module ID is an absolute path.
// When context is "auto", the plugin should derive the context from that
// absolute path directly, not concatenate it with compiler.context.
const virtualModulePath = path.join(__dirname, "virtual-entry.js");

/** @type {import("webpack").Configuration} */
const config = {
	entry: `virtual:${virtualModulePath}`,
	plugins: [
		new VirtualUrlPlugin({
			[virtualModulePath]: {
				context: "auto",
				source() {
					return "import { value } from './helper.js'; it('should resolve relative imports from absolute-path virtual modules', (done) => { expect(value).toBe('helper-value'); done(); });";
				}
			}
		})
	],
	validate: true
};

module.exports = config;
