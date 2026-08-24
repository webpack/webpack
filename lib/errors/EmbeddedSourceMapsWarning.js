/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class EmbeddedSourceMapsWarning extends WebpackError {
	/**
	 * Creates an instance of EmbeddedSourceMapsWarning.
	 * @param {string} devtool the devtool that embeds them
	 */
	constructor(devtool) {
		super(
			`embedded source maps: 'devtool: "${devtool}"' writes the source map into the JavaScript itself, and this is a production build.\nThe map is then downloaded by everyone who loads the page, several times the size of the code it describes. A separate '.map' file is fetched only by whoever opens the devtools, and 'hidden-source-map' keeps it off the client entirely while still uploading to an error reporter.\nFor more info visit https://webpack.js.org/configuration/devtool/#production`
		);

		/** @type {string} */
		this.name = "EmbeddedSourceMapsWarning";
	}
}

module.exports = EmbeddedSourceMapsWarning;
