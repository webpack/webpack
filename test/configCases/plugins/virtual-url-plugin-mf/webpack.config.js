"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	plugins: [
		new webpack.container.ModuleFederationPlugin({
			name: "host",
			shared: {
				react: {
					import: "react",
					eager: true,
					singleton: false
				}
			}
		}),
		new webpack.experiments.schemes.VirtualUrlPlugin({
			type: ".js",
			routes: {
				source() {
					return `
	  import React from 'react';
	  export default [React];
			  `;
				}
			}
		})
	]
};

module.exports = config;
