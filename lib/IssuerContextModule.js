/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ContextModule = require("./ContextModule");
const makeSerializable = require("./util/makeSerializable");

/** @import { ContextModuleOptions } from "./ContextModule" */

/** @typedef {ContextModuleOptions & { issuer?: string }} IssuerContextModuleOptions */

class IssuerContextModule extends ContextModule {
	/**
	 * @private
	 * @returns {string | undefined} issuer resource
	 */
	_getIssuer() {
		return /** @type {IssuerContextModuleOptions} */ (this.options).issuer;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	_createIdentifier() {
		const identifier = super._createIdentifier();
		const issuer = this._getIssuer();
		return issuer ? `${identifier}|issuer: ${issuer}` : identifier;
	}

	/**
	 * Returns the path used when matching modules created by this context against
	 * issuer conditions.
	 * @returns {string | null} issuer resource
	 */
	nameForCondition() {
		return this._getIssuer() || null;
	}
}

makeSerializable(IssuerContextModule, "webpack/lib/IssuerContextModule");

module.exports = IssuerContextModule;
