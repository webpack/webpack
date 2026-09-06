/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const WebpackError = require("./WebpackError");

class SSRManifestAutoPublicPathWarning extends WebpackError {
	/**
	 * Creates an instance of SSRManifestAutoPublicPathWarning.
	 */
	constructor() {
		super(
			"SSRManifestPlugin cannot resolve 'output.publicPath: \"auto\"'. That value is computed in the browser from the script url, which a manifest written at build time has no way to know, so the manifest falls back to '/'. Served from anywhere else, the urls the server prints are not the ones the runtime builds: nothing is adopted, every stylesheet is fetched a second time and its rules applied twice. Set 'output.publicPath' explicitly in the client build."
		);

		/** @type {string} */
		this.name = "SSRManifestAutoPublicPathWarning";
	}
}

module.exports = SSRManifestAutoPublicPathWarning;
