var webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [new webpack.debug.ProfilingPlugin()]
};
