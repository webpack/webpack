/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const path = require("path");
const memoize = require("./memoize");

// data URL scheme: "data:text/javascript;charset=utf-8;base64,some-string"
// http://www.ietf.org/rfc/rfc2397.txt
const URIRegEx = /^data:([^;,]+)?((?:;[^;,]+)*?)(?:;(base64)?)?,(.*)$/i;

/**
 * Decodes the provided uri.
 * @param {string} uri data URI
 * @returns {Buffer | null} decoded data
 */
const decodeDataURI = (uri) => {
	const match = URIRegEx.exec(uri);
	if (!match) return null;

	const isBase64 = match[3];
	const body = match[4];

	if (isBase64) {
		return Buffer.from(body, "base64");
	}

	// CSS allows to use `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" style="stroke: rgb(223,224,225); stroke-width: 2px; fill: none; stroke-dasharray: 6px 3px" /></svg>`
	// so we return original body if we can't `decodeURIComponent`
	try {
		return Buffer.from(decodeURIComponent(body), "utf8");
	} catch (_) {
		return Buffer.from(body, "utf8");
	}
};

/**
 * A `data:` URI split into the parts a caller has to put back together.
 * `parameters` is every `;…` after the media type (`;base64` included) and
 * `payload` the text after the comma, both in the form they were written.
 * @typedef {{ mediaType: string, parameters: string, base64: boolean, payload: string }} ParsedDataURI
 */

// `URIRegEx`'s `.` stops at a newline, which a raw `<svg>` payload carries, and
// its optional `base64` group reads `;charset=utf8` as one. This is the strict
// split a rewriter needs; that one stays as the matcher for module requests.
const STRICT_URI_REGEXP = /^data:([^,;]*)((?:;[^,;]*)*),([\s\S]*)$/i;

const JSON_TYPE = "json";
const SVG_TYPE = "svg";
const CSS_TYPE = "css";
const HTML_TYPE = "html";
const JAVASCRIPT_TYPE = "javascript";

/**
 * Every language `languageOfMediaType` can name, for a consumer that has to say
 * up front which of them it handles. Stated here rather than at each such
 * consumer: adding one below adds it to every ability that names this.
 * @type {string[]}
 */
const EMBEDDED_LANGUAGES = [
	SVG_TYPE,
	CSS_TYPE,
	HTML_TYPE,
	JSON_TYPE,
	JAVASCRIPT_TYPE
];

/**
 * The language name a media type carries, for a consumer that dispatches on it
 * — a `renderEmbeddedSource` renderer today. Not a grammar table read out of a
 * dataset: it is the handful of essences webpack itself has a notion of, so an
 * unknown one declines rather than guessing. The `+json` structured suffix is
 * read off the subtype.
 * @param {string} mediaType a media type, e.g. `image/svg+xml`
 * @returns {string | undefined} the language, or undefined when it names none
 */
const languageOfMediaType = (mediaType) => {
	const essence = mediaType.toLowerCase().trim();
	if (essence === "") return undefined;
	if (essence === "image/svg+xml") return SVG_TYPE;
	if (essence === "text/css") return CSS_TYPE;
	if (essence === "text/html") return HTML_TYPE;
	if (essence === "application/json" || essence.endsWith("+json")) {
		return JSON_TYPE;
	}
	if (/^(?:text|application)\/(?:x-)?(?:ecma|java)script$/.test(essence)) {
		return JAVASCRIPT_TYPE;
	}
	return undefined;
};

const getMimeTypes = memoize(() => require("./mimeTypes"));

/**
 * The language a file's name says it holds, for a module that embeds the file's
 * text rather than a `data:` URI — the same question `languageOfMediaType`
 * answers, read off the extension through webpack's own mime lookup.
 * @param {string | null} filename the file's name, or null when it has none
 * @returns {string | undefined} the language, or undefined when it names none
 */
const languageOfFilename = (filename) => {
	if (!filename) return undefined;
	const mediaType = getMimeTypes().lookup(path.extname(filename));
	return typeof mediaType === "string"
		? languageOfMediaType(mediaType)
		: undefined;
};

/**
 * Split a `data:` URI, or `null` when it is not one.
 * @param {string} uri the URI, unquoted and unescaped
 * @returns {ParsedDataURI | null} its parts
 */
const parseDataURI = (uri) => {
	const match = STRICT_URI_REGEXP.exec(uri);
	if (match === null) return null;
	return {
		mediaType: match[1],
		parameters: match[2],
		base64: /;base64$/i.test(match[2]),
		payload: match[3]
	};
};

/**
 * The payload as text, or `null` when reading it would not round-trip. A
 * percent-escaped payload is declined rather than decoded: how much of it the
 * author escaped is not recorded anywhere in the URI, so re-escaping would
 * rewrite bytes nothing asked to change. So is one holding a `#`, where the
 * payload a browser reads ends and a fragment starts.
 * @param {ParsedDataURI} parsed the split URI
 * @returns {string | null} the payload as text
 */
const decodeDataURIPayload = (parsed) => {
	if (!parsed.base64) {
		const { payload } = parsed;
		return payload.includes("%") || payload.includes("#") ? null : payload;
	}
	// Decoding is lenient rather than throwing, so garbage decodes to something
	// that does not round-trip, which is the same answer: leave it alone.
	const text = Buffer.from(parsed.payload, "base64").toString("utf8");
	return Buffer.from(text, "utf8").toString("base64") === parsed.payload
		? text
		: null;
};

/**
 * A `data:` URI's payload as text, for a caller that will render it, with the
 * language its media type names. `null` when there is nothing to offer: not a
 * `data:` URI, a media type naming no language, or a payload that would not
 * round-trip.
 * @param {string} uri the URI, unquoted and unescaped
 * @returns {{ parsed: ParsedDataURI, type: string, payload: string } | null} what it holds, or null
 */
const readEmbeddedDataURI = (uri) => {
	const parsed = parseDataURI(uri);
	if (parsed === null) return null;
	const type = languageOfMediaType(parsed.mediaType);
	if (type === undefined) return null;
	const payload = decodeDataURIPayload(parsed);
	if (payload === null || payload === "") return null;
	return { parsed, type, payload };
};

/**
 * Escape a payload for a `data:` URI written without `base64`, touching only
 * what would change what the URI means. The host's own quoting is the caller's.
 * @param {string} text the payload as text
 * @returns {string} the escaped payload
 */
const encodeDataURIPayload = (text) => {
	// WHY: `%` starts an escape and `#` a fragment. The URL parser drops every
	// tab and newline and strips C0 controls and spaces off the end, so those
	// are escaped too, or the payload read back is not the one written.
	let trailing = text.length;
	while (trailing > 0 && text.charCodeAt(trailing - 1) === 0x20) trailing--;
	let out = "";
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		const c = text.charCodeAt(i);
		if (c > 0x20 && c !== 0x7f && c !== 0x25 && c !== 0x23) continue;
		if (c === 0x20 && i < trailing) continue;
		out += `${text.slice(start, i)}%${c < 0x10 ? "0" : ""}${c
			.toString(16)
			.toUpperCase()}`;
		start = i + 1;
	}
	return start === 0 ? text : out + text.slice(start);
};

/**
 * Rebuild a `data:` URI around a new payload, in the form it was written in.
 * @param {ParsedDataURI} parsed the split URI
 * @param {string} text the new payload as text
 * @returns {string} the rebuilt URI
 */
const buildDataURI = (parsed, text) => {
	// A `;charset=` names how the payload decodes, so it is kept as written.
	const head = `data:${parsed.mediaType}${parsed.parameters},`;
	if (parsed.base64) {
		return head + Buffer.from(text, "utf8").toString("base64");
	}
	return head + encodeDataURIPayload(text);
};

/**
 * The minified text a renderer answered with, for one that may answer with a
 * whole result instead. `undefined` is a renderer that declined.
 * @param {string | { code?: string } | undefined} answer what it answered
 * @returns {string | undefined} the text, or undefined
 */
const embeddedText = (answer) =>
	answer === undefined || typeof answer === "string" ? answer : answer.code;

/**
 * Everything a run's renderers reported, in the shape a minifier returns —
 * an empty list is left off, so a run nothing was reported over is exactly
 * what it always was.
 * @param {{ warnings?: (Error | string)[], errors?: (Error | string)[] }[]} reported what each answered with
 * @returns {{ warnings?: (Error | string)[], errors?: (Error | string)[] }} the collected diagnostics
 */
const collectEmbeddedDiagnostics = (reported) => {
	/** @type {(Error | string)[]} */
	const warnings = [];
	/** @type {(Error | string)[]} */
	const errors = [];

	for (const entry of reported) {
		if (entry.warnings !== undefined) warnings.push(...entry.warnings);
		if (entry.errors !== undefined) errors.push(...entry.errors);
	}

	/** @type {{ warnings?: (Error | string)[], errors?: (Error | string)[] }} */
	const out = {};

	if (warnings.length !== 0) out.warnings = warnings;
	if (errors.length !== 0) out.errors = errors;

	return out;
};

/**
 * One embedded body a print offered but could not wait for, and the text to
 * print around the answer once it is in: {@link import("./SourceProcessor").DeferredWrite},
 * plus what the grammar has to say about what it offered. `as` names which of
 * that language's productions the body is, where it has more than one — an HTML
 * `style=""` is `"block-contents"` rather than a whole stylesheet.
 * @typedef {import("./SourceProcessor").DeferredWrite & { type: string, hostType: string, as?: string }} DeferredEmbeddedSource
 */

/**
 * What a renderer made of one embedded body: the minified text, and anything it
 * has to report about it. A bare string is the text alone, `undefined` a
 * renderer that declined.
 * @typedef {{ code?: string, warnings?: (Error | string)[], errors?: (Error | string)[] }} EmbeddedSourceResult
 */

/**
 * Ask a renderer for one embedded body and keep what it reported. Anything it
 * throws is a renderer that did not answer rather than an asset that fails to
 * serialize: the rest of the print stands, the body is spelled as an untapped
 * run spells it, and why it was is not lost.
 * @param {(source: string, info: { type: string, hostType: string, as?: string }) => Promise<string | EmbeddedSourceResult | undefined> | string | EmbeddedSourceResult | undefined} render the caller's renderer
 * @param {{ source: string, type: string, hostType: string, as?: string }} hole the body to offer
 * @param {EmbeddedSourceResult[]} reported collects what each says about them
 * @returns {Promise<string | EmbeddedSourceResult | undefined>} what it answered, or undefined where it declined or threw
 */
const askEmbeddedRenderer = async (render, hole, reported) => {
	const { source, type, hostType, as } = hole;

	try {
		const answer = await render(source, {
			type,
			hostType,
			...(as === undefined ? undefined : { as })
		});

		if (
			answer !== undefined &&
			typeof answer !== "string" &&
			(answer.warnings !== undefined || answer.errors !== undefined)
		) {
			reported.push(answer);
		}

		return answer;
	} catch (error) {
		reported.push({ errors: [/** @type {Error} */ (error)] });
		return undefined;
	}
};

module.exports = {
	EMBEDDED_LANGUAGES,
	URIRegEx,
	askEmbeddedRenderer,
	buildDataURI,
	collectEmbeddedDiagnostics,
	decodeDataURI,
	decodeDataURIPayload,
	embeddedText,
	encodeDataURIPayload,
	languageOfFilename,
	languageOfMediaType,
	parseDataURI,
	readEmbeddedDataURI
};
