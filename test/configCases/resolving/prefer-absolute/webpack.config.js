"use strict";

/**
 * @import {
 * 	Resolver,
 * 	ResolveRequest,
 * 	ResolveContext
 * } from "enhanced-resolve"
 */
/** @import { SyncBailHook } from "tapable" */
/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */

module.exports = {
	resolve: {
		preferAbsolute: true,
		plugins: [
			{
				/**
				 * @param {Resolver & { hooks: { file: SyncBailHook<[ResolveRequest, ResolveContext], void> } }} resolver resolver
				 */
				apply(resolver) {
					resolver.hooks.file.tap("Test", (request) => {
						if (
							/test.configCases.*test.configCases/.test(
								/** @type {string} */
								(request.path)
							)
						) {
							throw new Error("Trying to resolve as root path");
						}
					});
				}
			}
		]
	}
};
