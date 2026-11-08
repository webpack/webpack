/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

// cspell:ignore Motte, motdotla

/*
 * `LINE`, `parse`, `_resolveEscapeSequences`, `expandValue` and `expand`
 * below are ported from dotenv v17.4.2 and dotenv-expand v13.0.0, both
 * BSD-2-Clause. Links stay version-pinned: later dotenv-expand releases
 * ship different license text.
 *
 * https://github.com/motdotla/dotenv/blob/v17.4.2/lib/main.js
 * https://github.com/motdotla/dotenv-expand/blob/v13.0.0/lib/main.js
 *
 * Copyright (c) 2015, Scott Motte
 * Copyright (c) 2016, Scott Motte
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

const DotenvExpansionError = require("../errors/DotenvExpansionError");
const DotenvFileError = require("../errors/DotenvFileError");
const FileSystemInfo = require("../fs/FileSystemInfo");
const { join } = require("../fs/fs");

/** @import { DotenvPluginOptions } from "../../declarations/WebpackOptions" */
/** @import { Schema } from "schema-utils" */
/** @import Compiler from "../Compiler" */
/** @import { ItemCacheFacade } from "../cache/CacheFacade" */
/** @import { InputFileSystem } from "../fs/fs" */
/** @import { Snapshot } from "../fs/FileSystemInfo" */

/** @typedef {Exclude<DotenvPluginOptions["prefix"], string | undefined>} Prefix */
/** @typedef {Record<string, string>} Env */

const DEFAULT_TEMPLATE = [
	".env",
	".env.local",
	".env.[mode]",
	".env.[mode].local"
];

// Regex for parsing .env files
// ported from https://github.com/motdotla/dotenv/blob/v17.4.2/lib/main.js#L38
const LINE =
	/^\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?$/gm;

const PLUGIN_NAME = "DotenvPlugin";

// Most characters expansion may add to all dotenv values together. Without a
// limit, variables that each reference the previous one twice double in size
// per line, so a short file expands to gigabytes.
const MAX_EXPANSION_GROWTH = 1024 * 1024;

// Most steps expansion may take for all dotenv values together: characters
// searched or inserted, plus 32 per replacement. Variables that reference
// each other in a cycle expand forever without growing.
const MAX_EXPANSION_WORK = 64 * 1024 * 1024;

// first character, and later characters, of an unbraced name (`$name`)
const FIRST_NAME_CHAR = /[a-z_]/i;
const NAME_CHAR = /\w/;

// polynomial hashes compare a value with variable values without building it
const HASH_BASE = 257;
// small enough that a hash times the base stays a 32-bit integer
const HASH_MODULUS_1 = 2097143;
const HASH_MODULUS_2 = 2097133;

/**
 * Parse .env file content
 * ported from https://github.com/motdotla/dotenv/blob/v17.4.2/lib/main.js#L41
 * @param {string | Buffer} src the source content to parse
 * @returns {Env} parsed environment variables object
 */
function parse(src) {
	const obj = /** @type {Env} */ (Object.create(null));

	// Convert buffer to string
	let lines = src.toString();

	// Convert line breaks to same format
	lines = lines.replace(/\r\n?/g, "\n");

	/** @type {null | RegExpExecArray} */
	let match;

	while ((match = LINE.exec(lines)) !== null) {
		const key = match[1];

		// Default undefined or null to empty string
		let value = match[2] || "";

		// Remove whitespace
		value = value.trim();

		// Check if double quoted
		const maybeQuote = value[0];

		// Remove surrounding quotes
		value = value.replace(/^(['"`])([\s\S]*)\1$/gm, "$2");

		// Expand newlines if double quoted
		if (maybeQuote === '"') {
			value = value.replace(/\\n/g, "\n");
			value = value.replace(/\\r/g, "\r");
		}

		// Add to object
		obj[key] = value;
	}

	return obj;
}

/**
 * Resolve escape sequences
 * ported from https://github.com/motdotla/dotenv-expand/blob/v13.0.0/lib/main.js#L3
 * @param {string} value value to resolve
 * @returns {string} resolved value
 */
function _resolveEscapeSequences(value) {
	return value.replace(/\\\$/g, "$");
}

/**
 * @typedef {object} ExpandState
 * @property {Env} env variables a reference can name; process.env wins
 * @property {Env} runningParsed file values expanded so far
 * @property {Map<string, string>} parsedHashKeys hash keys of `runningParsed` values, computed when needed
 * @property {Map<number, string[]>} pendingValues nonempty `env` values by length, not yet in `valuesByHash`
 * @property {Map<string, string[]>} valuesByHash nonempty `env` values by hash key
 * @property {number[]} powers1 powers of `HASH_BASE` modulo `HASH_MODULUS_1`
 * @property {number[]} powers2 powers of `HASH_BASE` modulo `HASH_MODULUS_2`
 * @property {number} remainingGrowth characters expansion may still add
 * @property {number} remainingWork steps expansion may still take
 */

/**
 * Hash key of a string: two polynomial hashes and the length.
 * @param {string} text text to hash
 * @returns {string} hash key
 */
const hashKeyOf = (text) => {
	let hash1 = 0;
	let hash2 = 0;
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		hash1 = (hash1 * HASH_BASE + code) % HASH_MODULUS_1;
		hash2 = (hash2 * HASH_BASE + code) % HASH_MODULUS_2;
	}
	return `${hash1}:${hash2}:${text.length}`;
};

/**
 * @param {ExpandState} state expand state
 * @param {string} item nonempty `env` value
 */
const addHashedValue = (state, item) => {
	const hashKey = hashKeyOf(item);
	const items = state.valuesByHash.get(hashKey);
	if (items === undefined) {
		state.valuesByHash.set(hashKey, [item]);
	} else if (!items.includes(item)) {
		items.push(item);
	}
};

/**
 * Index of the first `{` or `}` at or after each position of a string.
 * @param {string} text text to index
 * @returns {Int32Array} index; `text.length` where there is none
 */
const braceIndexOf = (text) => {
	const index = new Int32Array(text.length + 1);
	index[text.length] = text.length;
	for (let position = text.length - 1; position >= 0; position--) {
		const char = text[position];
		index[position] =
			char === "{" || char === "}" ? position : index[position + 1];
	}
	return index;
};

/**
 * Expand environment variable value
 * ported from https://github.com/motdotla/dotenv-expand/blob/v13.0.0/lib/main.js#L7
 * @param {string} value value to expand
 * @param {ExpandState} state state shared by the values of one `expand` call
 * @param {string} name name of the variable being expanded
 * @returns {string} expanded value
 */
function expandValue(value, state, name) {
	// WHY: dotenv-expand replaces the first reference with `String#replace` and
	// then searches the whole value again, so the text a replacement inserts is
	// expanded too. This gives the same results without searching or copying
	// the whole value per reference. The value is split at the search position:
	// the searched text before it is held as character codes with prefix hashes,
	// the text after it as a stack of strings. After a replacement only a `$`
	// right before the position, or the last `${` not yet closed, can start a
	// match before it. The hashes compare the value with variable values, for
	// the self-reference and stop checks, without building it.
	// without a `$` there is nothing to expand
	if (!value.includes("$")) return value;

	const { env, runningParsed, powers1, powers2 } = state;
	const maxLength = value.length + state.remainingGrowth;
	let work = 0;
	// cycle check (Brent's algorithm): the step whose state is kept, and that state
	let steps = 0;
	let checkpoint = 1;
	/** @type {string | undefined} */
	let checkpointHashKey;
	let checkpointSeenSize = 0;
	let checkpointText = "";

	// searched text: character codes, prefix hashes, positions of braces and of `\$`
	let codes = new Uint16Array(value.length + 16);
	let prefixHashes1 = new Int32Array(codes.length + 1);
	let prefixHashes2 = new Int32Array(codes.length + 1);
	let searched = 0;
	/** @type {number[]} */
	const braces = [];
	/** @type {number[]} */
	const escapes = [];
	// bumped whenever the searched text shrinks, which invalidates `escapeSearches`
	let shrinks = 0;
	/** @type {Map<string, [number, number]>} */
	const escapeSearches = new Map();

	// text still to search: a stack of strings, the top one first
	/** @type {string[]} */
	const texts = [];
	/** @type {number[]} */
	const offsets = [];
	let restLength = 0;
	let restHash1 = 0;
	let restHash2 = 0;
	/** @type {Map<string, Int32Array>} */
	const braceIndexes = new Map();

	/** @type {Set<string>} */
	const seen = new Set(); // `env` values the whole value equaled

	/**
	 * @param {number} length length the searched text grows to
	 */
	const reserve = (length) => {
		if (length <= codes.length) return;
		const capacity = Math.max(length, codes.length * 2);
		const newCodes = new Uint16Array(capacity);
		newCodes.set(codes.subarray(0, searched));
		codes = newCodes;
		const newHashes1 = new Int32Array(capacity + 1);
		newHashes1.set(prefixHashes1.subarray(0, searched + 1));
		prefixHashes1 = newHashes1;
		const newHashes2 = new Int32Array(capacity + 1);
		newHashes2.set(prefixHashes2.subarray(0, searched + 1));
		prefixHashes2 = newHashes2;
	};

	/**
	 * @param {number} from start of the range
	 * @param {number} to end of the range
	 * @returns {string} searched text in the range
	 */
	const searchedText = (from, to) => {
		let text = "";
		for (let start = from; start < to; start += 8192) {
			text += String.fromCharCode(
				...codes.subarray(start, Math.min(to, start + 8192))
			);
		}
		work += to - from;
		return text;
	};

	/**
	 * @param {number} length largest power needed
	 */
	const reservePowers = (length) => {
		for (let power = powers1.length; power <= length; power++) {
			powers1.push((powers1[power - 1] * HASH_BASE) % HASH_MODULUS_1);
			powers2.push((powers2[power - 1] * HASH_BASE) % HASH_MODULUS_2);
		}
	};

	/**
	 * @param {string} text text to put in front of the text still to search
	 */
	const pushText = (text) => {
		if (text.length === 0) return;
		reservePowers(restLength + text.length);
		let hash1 = 0;
		let hash2 = 0;
		for (let index = 0; index < text.length; index++) {
			const code = text.charCodeAt(index);
			hash1 = (hash1 * HASH_BASE + code) % HASH_MODULUS_1;
			hash2 = (hash2 * HASH_BASE + code) % HASH_MODULUS_2;
		}
		restHash1 =
			(((hash1 * powers1[restLength]) % HASH_MODULUS_1) + restHash1) %
			HASH_MODULUS_1;
		restHash2 =
			(((hash2 * powers2[restLength]) % HASH_MODULUS_2) + restHash2) %
			HASH_MODULUS_2;
		restLength += text.length;
		texts.push(text);
		offsets.push(0);
		work += text.length;
	};

	/**
	 * @param {number} length number of characters to move from the text still to search to the searched text, or to drop
	 * @param {boolean} keep whether to move them rather than drop them
	 * @returns {string} the characters when dropped, otherwise ""
	 */
	const take = (length, keep) => {
		let dropped = "";
		while (length > 0) {
			const top = texts.length - 1;
			const text = texts[top];
			const offset = offsets[top];
			const end = Math.min(text.length, offset + length);
			let runHash1 = 0;
			let runHash2 = 0;
			if (keep) reserve(searched + end - offset);
			let hash1 = prefixHashes1[searched];
			let hash2 = prefixHashes2[searched];
			for (let index = offset; index < end; index++) {
				const code = text.charCodeAt(index);
				runHash1 = (runHash1 * HASH_BASE + code) % HASH_MODULUS_1;
				runHash2 = (runHash2 * HASH_BASE + code) % HASH_MODULUS_2;
				if (keep) {
					if (code === 36) {
						// `$`
						if (searched > 0 && codes[searched - 1] === 92) {
							escapes.push(searched);
						}
					} else if (code === 123 || code === 125) {
						// `{` or `}`
						braces.push(searched);
					}
					codes[searched] = code;
					hash1 = (hash1 * HASH_BASE + code) % HASH_MODULUS_1;
					hash2 = (hash2 * HASH_BASE + code) % HASH_MODULUS_2;
					searched++;
					prefixHashes1[searched] = hash1;
					prefixHashes2[searched] = hash2;
				}
			}
			if (!keep) dropped += text.slice(offset, end);
			restLength -= end - offset;
			restHash1 =
				(restHash1 -
					((runHash1 * powers1[restLength]) % HASH_MODULUS_1) +
					HASH_MODULUS_1) %
				HASH_MODULUS_1;
			restHash2 =
				(restHash2 -
					((runHash2 * powers2[restLength]) % HASH_MODULUS_2) +
					HASH_MODULUS_2) %
				HASH_MODULUS_2;
			if (end === text.length) {
				texts.pop();
				offsets.pop();
			} else {
				offsets[top] = end;
			}
			work += end - offset;
			length -= end - offset;
		}
		return dropped;
	};

	/**
	 * @param {number} ahead 0 or 1
	 * @returns {string | undefined} character `ahead` places into the text still to search
	 */
	const peekChar = (ahead) => {
		for (let top = texts.length - 1; top >= 0; top--) {
			const available = texts[top].length - offsets[top];
			if (ahead < available) return texts[top][offsets[top] + ahead];
			ahead -= available;
		}
		return undefined;
	};

	/**
	 * @param {number} ahead first place to look at
	 * @returns {number} place of the first brace at or after `ahead` if it is `}`, -1 if it is `{` or there is none
	 */
	const findClosingBrace = (ahead) => {
		let start = 0;
		for (let top = texts.length - 1; top >= 0; top--) {
			const text = texts[top];
			const offset = offsets[top];
			const available = text.length - offset;
			work++;
			if (ahead < start + available) {
				let braceIndex = braceIndexes.get(text);
				if (braceIndex === undefined) {
					braceIndex = braceIndexOf(text);
					braceIndexes.set(text, braceIndex);
					work += text.length;
				}
				const position =
					braceIndex[offset + (ahead > start ? ahead - start : 0)];
				if (position < text.length) {
					return text[position] === "}" ? start + position - offset : -1;
				}
			}
			start += available;
		}
		return -1;
	};

	/**
	 * @param {number} length length the searched text shrinks to; the rest goes back in front of the text still to search
	 */
	const shrinkTo = (length) => {
		if (length >= searched) return;
		const text = searchedText(length, searched);
		searched = length;
		while (braces.length > 0 && braces[braces.length - 1] >= length) {
			braces.pop();
		}
		while (escapes.length > 0 && escapes[escapes.length - 1] >= length) {
			escapes.pop();
		}
		shrinks++;
		pushText(text);
	};

	/**
	 * @returns {string} hash key of the whole value
	 */
	const currentHashKey = () => {
		const hash1 =
			(((prefixHashes1[searched] * powers1[restLength]) % HASH_MODULUS_1) +
				restHash1) %
			HASH_MODULUS_1;
		const hash2 =
			(((prefixHashes2[searched] * powers2[restLength]) % HASH_MODULUS_2) +
				restHash2) %
			HASH_MODULUS_2;
		return `${hash1}:${hash2}:${searched + restLength}`;
	};

	/**
	 * @returns {string} text still to search
	 */
	const restText = () => {
		let text = "";
		for (let top = texts.length - 1; top >= 0; top--) {
			text += texts[top].slice(offsets[top]);
		}
		work += restLength;
		return text;
	};

	/**
	 * `String#replace` replaces the first occurrence of the template, which
	 * is an escaped one (`\$name`) when there is one before the match.
	 * @param {string} template matched template
	 * @returns {number} position of its first occurrence in the searched text, or the searched text's length
	 */
	const findEscapedOccurrence = (template) => {
		const cached = escapeSearches.get(template);
		let index = cached !== undefined && cached[0] === shrinks ? cached[1] : 0;
		const templateHashKey = hashKeyOf(template);
		work += template.length;
		const last = searched - template.length;
		let found = searched;
		for (; index < escapes.length; index++) {
			const start = escapes[index];
			if (start > last) break;
			work++;
			const end = start + template.length;
			const hash1 =
				(prefixHashes1[end] -
					((prefixHashes1[start] * powers1[template.length]) % HASH_MODULUS_1) +
					HASH_MODULUS_1) %
				HASH_MODULUS_1;
			const hash2 =
				(prefixHashes2[end] -
					((prefixHashes2[start] * powers2[template.length]) % HASH_MODULUS_2) +
					HASH_MODULUS_2) %
				HASH_MODULUS_2;
			if (
				`${hash1}:${hash2}:${template.length}` === templateHashKey &&
				searchedText(start, end) === template
			) {
				found = start;
				break;
			}
		}
		escapeSearches.set(template, [shrinks, index]);
		return found;
	};

	pushText(value);

	for (; ; work += 32) {
		if (work > state.remainingWork) {
			throw new DotenvExpansionError(
				name,
				`takes more than ${MAX_EXPANSION_WORK} steps`
			);
		}

		// find the leftmost match of `(?<!\\)\$\{([^{}]+)\}|(?<!\\)\$([a-z_]\w*)`
		let start = -1;
		// template length when braced, 0 when unbraced
		let length = 0;
		const lastBrace = braces.length > 0 ? braces[braces.length - 1] : -1;
		if (
			lastBrace > 0 &&
			codes[lastBrace] === 123 &&
			codes[lastBrace - 1] === 36 &&
			(lastBrace < 2 || codes[lastBrace - 2] !== 92)
		) {
			// the last `${` not yet closed
			const closing = findClosingBrace(0);
			if (closing !== -1 && searched - lastBrace - 1 + closing > 0) {
				start = lastBrace - 1;
				length = searched - start + closing + 1;
			}
		}
		if (
			start === -1 &&
			searched > 0 &&
			codes[searched - 1] === 36 &&
			(searched < 2 || codes[searched - 2] !== 92)
		) {
			const next = peekChar(0);
			if (next === "{") {
				const closing = findClosingBrace(1);
				if (closing > 1) {
					start = searched - 1;
					length = closing + 2;
				}
			} else if (next !== undefined && FIRST_NAME_CHAR.test(next)) {
				start = searched - 1;
			}
		}
		while (start === -1) {
			if (restLength === 0) break;
			const top = texts.length - 1;
			const text = texts[top];
			const offset = offsets[top];
			if (text[offset] !== "$") {
				// move the text up to the next `$` at once
				const end = text.indexOf("$", offset);
				take((end === -1 ? text.length : end) - offset, true);
				continue;
			}
			if (searched === 0 || codes[searched - 1] !== 92) {
				const next = peekChar(1);
				if (next === "{") {
					const closing = findClosingBrace(2);
					if (closing > 2) {
						start = searched;
						length = closing + 1;
						break;
					}
				} else if (next !== undefined && FIRST_NAME_CHAR.test(next)) {
					start = searched;
					break;
				}
			}
			take(1, true);
		}
		if (start === -1) break;

		// self-referential checker: dotenv-expand keeps every whole value
		const wholeLength = searched + restLength;
		const pending = state.pendingValues.get(wholeLength);
		if (pending !== undefined) {
			state.pendingValues.delete(wholeLength);
			for (const item of pending) {
				work += item.length;
				addHashedValue(state, item);
			}
		}
		if (state.valuesByHash.size > 0) {
			const items = state.valuesByHash.get(currentHashKey());
			if (items !== undefined && items.some((item) => !seen.has(item))) {
				const text = searchedText(0, searched) + restText();
				for (const item of items) {
					if (item === text) seen.add(item);
				}
			}
		}

		// WHY: what dotenv-expand does next depends only on the whole value and on
		// `seen`, which only grows. A state seen before, with `seen` the same
		// size, repeats forever, so stop here rather than spend the step budget.
		const hashKey = currentHashKey();
		if (
			hashKey === checkpointHashKey &&
			seen.size === checkpointSeenSize &&
			searchedText(0, searched) + restText() === checkpointText
		) {
			throw new DotenvExpansionError(name, "never finishes: it repeats");
		}
		if (++steps === checkpoint) {
			checkpoint *= 2;
			checkpointHashKey = hashKey;
			checkpointSeenSize = seen.size;
			checkpointText = searchedText(0, searched) + restText();
		}

		shrinkTo(start);
		let template;
		if (length > 0) {
			template = take(length, false);
		} else {
			// `$` and the longest run of name characters after it
			template = take(1, false);
			let next;
			while ((next = peekChar(0)) !== undefined && NAME_CHAR.test(next)) {
				template += take(1, false);
			}
		}
		const expression = length > 0 ? template.slice(2, -1) : template.slice(1);

		// match the operators `:+`, `+`, `:-`, and `-`
		const opRegex = /(:\+|\+|:-|-)/;
		// find first match
		const opMatch = expression.match(opRegex);
		const splitter = opMatch ? opMatch[0] : null;

		// `split(null)` splits on the string "null", cutting up names containing it
		const r = splitter ? expression.split(splitter) : [expression];

		/** @type {string} */
		let defaultValue;
		/** @type {undefined | null | string} */
		let value;

		const key = r.shift();

		if ([":+", "+"].includes(splitter || "")) {
			defaultValue = env[key || ""] ? r.join(splitter || "") : "";
			value = null;
		} else {
			defaultValue = r.join(splitter || "");
			value = env[key || ""];
		}

		// self-referential check
		const replacement = value && !seen.has(value) ? value : defaultValue;

		const occurrence =
			escapes.length > 0 ? findEscapedOccurrence(template) : searched;
		if (occurrence < searched) {
			pushText(template);
			shrinkTo(occurrence);
			take(template.length, false);
		}

		// the `$$`, `$&`, `` $` `` and `$'` patterns of `String#replace`
		const growthError = () =>
			new DotenvExpansionError(
				name,
				`adds more than ${MAX_EXPANSION_GROWTH} characters to the dotenv values in total`
			);
		const room = maxLength - searched - restLength;
		let inserted = replacement;
		if (replacement.includes("$")) {
			/** @type {string | undefined} */
			let after;
			inserted = "";
			for (let index = 0; index < replacement.length; index++) {
				const char = replacement[index];
				const next = replacement[index + 1];
				if (char === "$" && next === "$") {
					inserted += "$";
				} else if (char === "$" && next === "&") {
					inserted += template;
				} else if (char === "$" && next === "`") {
					inserted += searchedText(0, searched);
				} else if (char === "$" && next === "'") {
					if (after === undefined) after = restText();
					inserted += after;
				} else {
					inserted += char;
					continue;
				}
				// `` $` `` and `$'` can each insert the whole value again
				if (inserted.length > room) throw growthError();
				index++;
			}
		}

		if (inserted.length > room) throw growthError();
		pushText(inserted);

		// if the result equaled what was in process.env and runningParsed then stop expanding
		const parsedValue = runningParsed[key || ""];
		if (
			parsedValue !== undefined &&
			parsedValue.length === searched + restLength
		) {
			let parsedHashKey = state.parsedHashKeys.get(parsedValue);
			if (parsedHashKey === undefined) {
				parsedHashKey = hashKeyOf(parsedValue);
				work += parsedValue.length;
				state.parsedHashKeys.set(parsedValue, parsedHashKey);
			}
			if (parsedHashKey === currentHashKey()) {
				const text = searchedText(0, searched) + restText();
				if (text === parsedValue) {
					state.remainingWork -= work;
					return text;
				}
			}
		}
	}

	state.remainingWork -= work;
	return searchedText(0, searched);
}

/**
 * Expand environment variables in parsed object
 * ported from https://github.com/motdotla/dotenv-expand/blob/v13.0.0/lib/main.js#L65
 * @param {{ parsed: Env, processEnv: Record<string, string | undefined> }} options expand options
 * @returns {{ parsed: Env }} expanded options
 */
function expand(options) {
	const processEnv = options.processEnv;
	/** @type {ExpandState} */
	const state = {
		// a null-prototype object, so `${toString}` and the like are unset variables
		env: Object.assign(Object.create(null), processEnv),
		// for use with progressive expansion
		runningParsed: /** @type {Env} */ (Object.create(null)),
		parsedHashKeys: new Map(),
		pendingValues: new Map(),
		valuesByHash: new Map(),
		powers1: [1],
		powers2: [1],
		remainingGrowth: MAX_EXPANSION_GROWTH,
		remainingWork: MAX_EXPANSION_WORK
	};

	/**
	 * @param {string | undefined} item value a reference can expand to
	 */
	const addValue = (item) => {
		if (!item) return;
		const items = state.pendingValues.get(item.length);
		if (items === undefined) {
			state.pendingValues.set(item.length, [item]);
		} else {
			items.push(item);
		}
	};
	for (const key in processEnv) addValue(processEnv[key]);

	// dotenv.config() ran before this so the assumption is process.env has already been set
	for (const key in options.parsed) {
		let value = options.parsed[key];

		// short-circuit scenario: process.env was already set prior to the file value
		if (
			Object.prototype.hasOwnProperty.call(processEnv, key) &&
			processEnv[key] !== value
		) {
			value = /** @type {string} */ (processEnv[key]);
		} else {
			const expanded = expandValue(value, state, key);
			state.remainingGrowth -= Math.max(0, expanded.length - value.length);
			value = expanded;
		}

		const resolvedValue = _resolveEscapeSequences(value);

		options.parsed[key] = resolvedValue;
		// for use with progressive expansion
		state.runningParsed[key] = resolvedValue;
		if (!Object.prototype.hasOwnProperty.call(processEnv, key)) {
			state.env[key] = resolvedValue;
			addValue(resolvedValue);
		}
	}

	// `dotenv-expand` writes the parsed values back into `process.env` here.
	// Omitted: webpack never mutates the ambient environment.

	return options;
}

/**
 * Format environment variables as DefinePlugin definitions
 * @param {Env} env environment variables
 * @returns {Record<string, string | Env>} formatted definitions
 */
const envToDefinitions = (env) => {
	const definitions = /** @type {Record<string, string | Env>} */ ({});
	// one nested definition rather than a `import.meta.env.<key>` per key: a
	// dotted key would otherwise read back as a nested object, not as the key
	const importMetaEnv = /** @type {Env} */ (Object.create(null));

	for (const [key, value] of Object.entries(env)) {
		const defValue = JSON.stringify(value);
		// `process.env` stays flat — it must not shadow the real one at runtime
		definitions[`process.env.${key}`] = defValue;
		importMetaEnv[key] = defValue;
	}
	definitions["import.meta.env"] = importMetaEnv;

	return definitions;
};

class DotenvPlugin {
	/**
	 * Creates an instance of DotenvPlugin.
	 * @param {DotenvPluginOptions=} options options object
	 */
	constructor(options = {}) {
		/** @type {DotenvPluginOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.validate.tap(PLUGIN_NAME, () => {
			compiler.validate(
				() => {
					const { definitions } = /** @type {Schema} */ (
						require("../../schemas/WebpackOptions.json")
					);

					return {
						definitions,
						oneOf: [{ $ref: "#/definitions/DotenvPluginOptions" }]
					};
				},
				this.options,
				{
					name: "Dotenv Plugin",
					baseDataPath: "options"
				},
				(options) =>
					require("../../schemas/plugins/define/DotenvPluginOptions.check")(
						options
					)
			);
		});
		const definePlugin = new compiler.webpack.DefinePlugin({});
		const prefixes = Array.isArray(this.options.prefix)
			? this.options.prefix
			: [this.options.prefix || "WEBPACK_"];
		/** @type {string | false} */
		const dir =
			typeof this.options.dir === "string"
				? this.options.dir
				: typeof this.options.dir === "undefined"
					? compiler.context
					: this.options.dir;

		/** @type {undefined | InstanceType<Snapshot>} */
		let snapshot;
		/** @type {undefined | DotenvFileError | DotenvExpansionError} */
		let loadError;

		const cache = compiler.getCache(PLUGIN_NAME);
		const identifier = JSON.stringify(
			this.options.template || DEFAULT_TEMPLATE
		);
		const itemCache = cache.getItemCache(identifier, null);

		compiler.hooks.beforeCompile.tapPromise(PLUGIN_NAME, async () => {
			loadError = undefined;
			snapshot = undefined;
			try {
				/** @type {{ parsed: Env, snapshot?: InstanceType<Snapshot> }} */
				const { parsed, snapshot: newSnapshot } = dir
					? await this._loadEnv(compiler, itemCache, dir)
					: { parsed: {} };
				// set first: watch mode rebuilds when an expansion error is fixed
				snapshot = newSnapshot;
				const env = this._getEnv(prefixes, parsed);

				definePlugin.definitions = envToDefinitions(env || {});
			} catch (err) {
				// reported on the compilation so watch mode recovers when it is fixed
				if (
					!(err instanceof DotenvFileError) &&
					!(err instanceof DotenvExpansionError)
				) {
					throw err;
				}
				loadError = err;
				definePlugin.definitions = envToDefinitions({});
			}
		});

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			if (loadError) {
				compilation.errors.push(loadError);
				if (loadError instanceof DotenvFileError) {
					compilation.fileDependencies.add(
						/** @type {string} */ (loadError.file)
					);
				}
			}
			if (snapshot) {
				compilation.fileDependencies.addAll(snapshot.getFileIterable());
				compilation.missingDependencies.addAll(snapshot.getMissingIterable());
			}
		});

		definePlugin.apply(compiler);
	}

	/**
	 * Get list of env files to load based on mode and template
	 * Similar to Vite's getEnvFilesForMode
	 * @private
	 * @param {InputFileSystem} inputFileSystem the input file system
	 * @param {string | false} dir the directory containing .env files
	 * @param {string | undefined} mode the mode (e.g., 'production', 'development')
	 * @returns {string[]} array of file paths to load
	 */
	_getEnvFilesForMode(inputFileSystem, dir, mode) {
		if (!dir) {
			return [];
		}

		const templates = this.options.template || DEFAULT_TEMPLATE;

		return templates
			.map((pattern) => pattern.replace(/\[mode\]/g, mode || "development"))
			.map((file) => join(inputFileSystem, dir, file));
	}

	/**
	 * Get parsed env variables from `.env` files
	 * @private
	 * @param {InputFileSystem} fs input file system
	 * @param {string} dir dir to load `.env` files
	 * @param {string} mode mode
	 * @returns {Promise<{ parsed: Env, fileDependencies: string[], missingDependencies: string[] }>} parsed env variables and dependencies
	 */
	async _getParsed(fs, dir, mode) {
		/** @type {string[]} */
		const fileDependencies = [];
		/** @type {string[]} */
		const missingDependencies = [];

		// Get env files to load
		const envFiles = this._getEnvFilesForMode(fs, dir, mode);

		// Read all files
		const contents = await Promise.all(
			envFiles.map((filePath) =>
				this._loadFile(fs, filePath).then(
					(content) => {
						fileDependencies.push(filePath);
						return content;
					},
					/**
					 * @param {NodeJS.ErrnoException} err file system error
					 * @returns {string} empty content for an absent file
					 */
					(err) => {
						const code = err.code;
						// only an absent file is normal; anything else is a real fault
						if (code !== "ENOENT" && code !== "ENOTDIR") {
							throw new DotenvFileError(filePath, err);
						}
						// File doesn't exist, add to missingDependencies (this is normal)
						missingDependencies.push(filePath);
						return "";
					}
				)
			)
		);

		// Parse all files and merge (later files override earlier ones)
		// Similar to Vite's implementation
		const parsed = /** @type {Env} */ (Object.create(null));

		for (const content of contents) {
			if (!content) continue;
			const entries = parse(content);
			for (const key in entries) {
				parsed[key] = entries[key];
			}
		}

		return { parsed, fileDependencies, missingDependencies };
	}

	/**
	 * Loads the provided compiler.
	 * @private
	 * @param {Compiler} compiler compiler
	 * @param {InstanceType<ItemCacheFacade>} itemCache item cache facade
	 * @param {string} dir directory to read
	 * @returns {Promise<{ parsed: Env, snapshot: InstanceType<Snapshot> }>} parsed result and snapshot
	 */
	async _loadEnv(compiler, itemCache, dir) {
		const fs = /** @type {InputFileSystem} */ (compiler.inputFileSystem);
		const fileSystemInfo = new FileSystemInfo(fs, {
			unmanagedPaths: compiler.unmanagedPaths,
			managedPaths: compiler.managedPaths,
			immutablePaths: compiler.immutablePaths,
			hashFunction: compiler.options.output.hashFunction
		});

		/** @type {{ parsed: Env, snapshot: InstanceType<Snapshot> } | undefined} */
		const result = await itemCache.getPromise();

		if (result) {
			/** @type {boolean | undefined} */
			const isSnapshotValid = await new Promise((resolve, reject) => {
				fileSystemInfo.checkSnapshotValid(result.snapshot, (error, isValid) => {
					if (error) {
						reject(error);

						return;
					}

					resolve(isValid);
				});
			});

			if (isSnapshotValid) {
				return { parsed: result.parsed, snapshot: result.snapshot };
			}
		}

		const { parsed, fileDependencies, missingDependencies } =
			await this._getParsed(
				fs,
				dir,
				/** @type {string} */
				(compiler.options.mode)
			);

		const startTime = Date.now();
		/** @type {InstanceType<Snapshot>} */
		const newSnapshot = await new Promise((resolve, reject) => {
			fileSystemInfo.createSnapshot(
				startTime,
				fileDependencies,
				null,
				missingDependencies,
				// `.env` files are build dependencies
				compiler.options.snapshot.buildDependencies,
				(err, snapshot) => {
					if (err) return reject(err);
					resolve(/** @type {InstanceType<Snapshot>} */ (snapshot));
				}
			);
		});

		await itemCache.storePromise({ parsed, snapshot: newSnapshot });

		return { parsed, snapshot: newSnapshot };
	}

	/**
	 * Generate env variables
	 * @private
	 * @param {Prefix} prefixes expose only environment variables that start with these prefixes
	 * @param {Env} parsed parsed env variables
	 * @returns {Env} env variables
	 */
	_getEnv(prefixes, parsed) {
		// Expansion mutates its input, but the cache must retain the raw file values.
		parsed = Object.assign(/** @type {Env} */ (Object.create(null)), parsed);
		// Always expand environment variables (like Vite does)
		// Make a copy of process.env so that dotenv-expand doesn't modify global process.env
		const processEnv = { ...process.env };
		expand({ parsed, processEnv });
		const env = /** @type {Env} */ (Object.create(null));

		// Get all keys from parser and process.env
		const keys = [...Object.keys(parsed), ...Object.keys(process.env)];

		// Prioritize actual env variables from `process.env`, fallback to parsed
		for (const key of keys) {
			if (prefixes.some((prefix) => key.startsWith(prefix))) {
				env[key] = Object.prototype.hasOwnProperty.call(process.env, key)
					? /** @type {string} */ (process.env[key])
					: parsed[key];
			}
		}

		return env;
	}

	/**
	 * Load a file with proper path resolution
	 * @private
	 * @param {InputFileSystem} fs the input file system
	 * @param {string} file the file to load
	 * @returns {Promise<string>} the content of the file
	 */
	_loadFile(fs, file) {
		return new Promise((resolve, reject) => {
			fs.readFile(file, (err, content) => {
				if (err) reject(err);
				else resolve(/** @type {Buffer} */ (content).toString() || "");
			});
		});
	}
}

module.exports = DotenvPlugin;
