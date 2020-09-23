/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const ElementType = require("domelementtype");
const { DomHandler } = require("domhandler");
const { Parser: HtmlParser2 } = require("htmlparser2");
const { SyncBailHook, HookMap } = require("tapable");
const Parser = require("../Parser");

/** @typedef {import("htmlparser2").ParserOptions} HtmlParserOptions */
/** @typedef {import("htmlparser2").DomHandlerOptions} HtmlParserDomHandlerOptions */
/** @typedef {import("domhandler").Node} DomNode */
/** @typedef {import("domhandler").Element} DomHandlerElement */
/** @typedef {import("domhandler").DataNode} DomDataNode */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {{[k: string]: {value: string, range: Readonly<[number, number]>}}} TagAttributes */
/** @typedef {Omit<DomHandlerElement, 'attribs'> & {attribs: TagAttributes}} DomElement */

/**
 * Webpack need custom handler to get attributes indexes in DOM structure
 */
class CustomDomHandler extends DomHandler {
	constructor(cb, options, elementCb, errorCb) {
		super(cb, options, elementCb);
		/** @type {{[k: string]: [number, number]}} */
		this._attributes = undefined;
		// process errors, if any
		this.onerror = errorCb;
	}

	// cspell:word onattribute
	onattribute(name, value) {
		if (!this._attributes) this._attributes = {};
		//@ts-expect-error
		const tokenizer = this._parser._tokenizer;
		const html = tokenizer._buffer;
		const endIndex = tokenizer._index;
		const startIndex = endIndex - value.length;
		const unquoted = html[endIndex] !== '"' && html[endIndex] !== "'";
		this._attributes[name] = [unquoted ? startIndex : startIndex - 1, endIndex];
	}

	// cspell:word onopentag
	onopentag(name, attributes) {
		super.onopentag(name, attributes);
		//@ts-expect-error
		const attribs = this._tagStack[this._tagStack.length - 1].attribs;

		for (const attributeName of Object.keys(this._attributes)) {
			const value = attribs[attributeName];
			attribs[attributeName] = {
				value,
				range: this._attributes[attributeName]
			};
		}
		this._attributes = undefined;
	}
}

class HtmlParser extends Parser {
	/**
	 * @param {HtmlParserOptions=} options htmlparser2 parser options
	 */
	constructor(options) {
		super();

		this._options = options;
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[DomElement], true | void | undefined | null>>} */
			tag: new HookMap(() => new SyncBailHook(["tag"])),
			/** @type {SyncBailHook<[DomDataNode], void | undefined | null>} */
			text: new SyncBailHook(["text"]),
			/** @type {SyncBailHook<[DomDataNode], void | undefined | null>} */
			directive: new SyncBailHook(["directive"]),
			/** @type {SyncBailHook<[DomDataNode], void | undefined | null>} */
			comment: new SyncBailHook(["directive"])
		});

		/** @type {ParserState} */
		this.state = undefined;
	}

	/**
	 * @param {DomNode[]} nodes nodes
	 */
	walkNodes(nodes) {
		for (const node of nodes) this.walkNode(node);
	}

	/**
	 * @param {DomNode} node nodes
	 */
	walkNode(node) {
		switch (node.type) {
			case ElementType.Script:
			case ElementType.Style:
			case ElementType.Tag:
				this.walkElement(/** @type {DomElement} */ (node));
				break;
			case ElementType.Comment:
				this.walkComment(/** @type {DomDataNode} */ (node));
				break;
			case ElementType.Directive:
				this.walkDirective(/** @type {DomDataNode} */ (node));
				break;
			case ElementType.Text:
				this.walkText(/** @type {DomDataNode} */ (node));
				break;
			case ElementType.CDATA:
			case ElementType.Doctype:
				break;
		}
	}

	/**
	 * @param {DomElement} element element
	 */
	walkElement(element) {
		const name = element.tagName;
		this.hooks.tag.for(name).call(element);
	}

	/**
	 * @param {DomDataNode} node element
	 */
	walkText(node) {
		this.hooks.text.call(node);
	}

	/**
	 * @param {DomDataNode} node element
	 */
	walkDirective(node) {
		this.hooks.directive.call(node);
	}

	/**
	 * @param {DomDataNode} node element
	 */
	walkComment(node) {
		this.hooks.comment.call(node);
	}

	/**
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		if (source === null) {
			throw new Error("source must not be null");
		}
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf-8");
		}

		const oldState = this.state;
		const dom = HtmlParser._parse(
			/** @type {string} */ (source),
			this._options
		);
		this.walkNodes(dom);
		this.state = oldState;

		return state;
	}

	/**
	 * @param {string} code code
	 * @param {HtmlParserOptions} options options
	 * @private
	 * @returns {DomNode[]} dom
	 */
	static _parse(code, options) {
		/** @type {HtmlParserOptions & HtmlParserDomHandlerOptions} */
		const htmlParserOptions = {
			...options,
			withStartIndices: true,
			withEndIndices: true
		};

		let dom;
		let errors = [];

		try {
			const handler = new CustomDomHandler(
				undefined,
				htmlParserOptions,
				undefined,
				e => errors.push(e)
			);
			new HtmlParser2(handler, options).end(code);
			dom = handler.dom;
		} catch (e) {
			errors = [e];
		}

		if (errors.length > 0) throw errors[0];

		return dom;
	}
}

module.exports = HtmlParser;
