/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const AsyncDependenciesBlock = require("../AsyncDependenciesBlock");
const DependenciesBlock = require("../DependenciesBlock");
const makeSerializable = require("../util/makeSerializable");

/** @import { GroupOptions } from "../AsyncDependenciesBlock" */
/** @import { DependencyLocation } from "../Dependency" */
/** @import { EntryOptions } from "../Entrypoint" */
/**
 * @import {
 * 	ObjectDeserializerContext,
 * 	ObjectSerializerContext
 * } from "../serialization/ObjectMiddleware"
 */

/**
 * Per-compilation URL entry identity applied by {@link URLDependenciesBlock#promote}.
 * @typedef {object} BlockPromotion
 * @property {EntryOptions} entryOptions
 * @property {string=} chunkFilenameGlobal
 */

/**
 * Async block for `new URL()`. Without `groupOptions.entryOptions` it stays in
 * the parent chunk; `promote` elevates it to an async entry for one compilation.
 */
class URLDependenciesBlock extends AsyncDependenciesBlock {
	/**
	 * @param {GroupOptions | string | null} groupOptions options for the group
	 * @param {(DependencyLocation | null)=} loc the line of code
	 * @param {(string | null)=} request the request
	 */
	constructor(groupOptions, loc, request) {
		if (typeof groupOptions === "string") {
			groupOptions = { name: groupOptions, circular: false };
		} else if (!groupOptions) {
			groupOptions = { name: undefined, circular: false };
		} else {
			groupOptions = { ...groupOptions, circular: false };
		}
		super(groupOptions, loc, request);
		/** @type {string | undefined} */
		this.chunkFilenameGlobal = undefined;
	}

	/**
	 * Marks this URL block as an async entry for the current compilation only.
	 * @param {BlockPromotion} promotion entry options and optional filename helper
	 * @returns {void}
	 */
	promote(promotion) {
		this.groupOptions.entryOptions = promotion.entryOptions;
		this.chunkFilenameGlobal = promotion.chunkFilenameGlobal;
		this._stringifiedGroupOptions = undefined;
	}

	/**
	 * Clears per-compilation entry identity so the block stays in the parent chunk.
	 * @returns {void}
	 */
	demote() {
		delete this.groupOptions.entryOptions;
		this.chunkFilenameGlobal = undefined;
		this._stringifiedGroupOptions = undefined;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		// Do not snapshot live groupOptions (may hold promote() entryOptions).
		write({
			name: this.groupOptions.name,
			circular: false
		});
		write(this.loc);
		write(this.request);
		DependenciesBlock.prototype.serialize.call(this, context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		const groupOptions = read();
		// Same skeleton serialize writes; drop any entryOptions an older pack may carry.
		this.groupOptions = {
			name: groupOptions && groupOptions.name,
			circular: false
		};
		this.loc = read();
		this.request = read();
		this.chunkFilenameGlobal = undefined;
		DependenciesBlock.prototype.deserialize.call(this, context);
	}
}

makeSerializable(URLDependenciesBlock, "webpack/lib/url/URLDependenciesBlock");

module.exports = URLDependenciesBlock;
