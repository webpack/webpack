/** @import Webpack, { WebpackPluginInstance } from "../../.." */

/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	target: "web"
};

/**
 * @param {Webpack} webpack the baseline's webpack
 * @returns {WebpackPluginInstance[]} plugins
 */
export function createPlugins(webpack) {
	return [new webpack.HotModuleReplacementPlugin()];
}
