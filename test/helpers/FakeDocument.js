"use strict";

const fs = require("node:fs");
const path = require("node:path");

/** @typedef {import("../../lib/css/syntax").MutableToken} MutableToken */
/** @typedef {Record<string, unknown> & { getPropertyValue: (property: string) => unknown }} StyleDeclaration */
/** @typedef {{ selectorText: string | undefined, style: StyleDeclaration, cssText: string }} CssRule */
/** @typedef {{ type: string, target?: FakeElement }} FakeEvent */
/** @typedef {(event: FakeEvent) => void} EventHandler */

/**
 * @this {StyleDeclaration}
 * @param {string} property property
 * @returns {unknown} value
 */
function getPropertyValue(property) {
	return this[property];
}

class FakeDocument {
	/**
	 * @param {string} basePath base path
	 */
	constructor(basePath) {
		this.head = this.createElement("head");
		this.body = this.createElement("body");
		this.baseURI = "https://test.cases/path/index.html";
		this.title = "";
		/** @type {Map<string, FakeElement[]>} */
		this._elementsByTagName = new Map([
			["head", [this.head]],
			["body", [this.body]]
		]);
		this._basePath = basePath;
		/** @type {undefined | ((src: string | undefined) => void)} */
		this.onScript = undefined;
	}

	/**
	 * @param {string} type element type
	 * @returns {FakeElement} element
	 */
	createElement(type) {
		return new FakeElement(this, type, this._basePath);
	}

	/**
	 * @param {FakeElement} element element
	 * @returns {void}
	 */
	_onElementAttached(element) {
		const type = element._type;
		let list = this._elementsByTagName.get(type);
		if (list === undefined) {
			list = [];
			this._elementsByTagName.set(type, list);
		}
		list.push(element);
	}

	/**
	 * @param {FakeElement} element element
	 * @returns {void}
	 */
	_onElementRemoved(element) {
		const type = element._type;
		const list = this._elementsByTagName.get(type);
		if (list === undefined) return;
		const idx = list.indexOf(element);
		list.splice(idx, 1);
	}

	/**
	 * @param {string} name tag name
	 * @returns {FakeElement[]} elements
	 */
	getElementsByTagName(name) {
		return this._elementsByTagName.get(name) || [];
	}

	/**
	 * @param {string} selector selector
	 * @returns {FakeElement[]} matching elements
	 */
	querySelectorAll(selector) {
		// Simple selector support for common cases
		// Tag selector: "link", "script", etc.
		if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(selector)) {
			return this.getElementsByTagName(selector);
		}
		// Class selector: ".class"
		if (selector.startsWith(".")) {
			const className = selector.slice(1);
			/** @type {FakeElement[]} */
			const allElements = [];
			for (const elements of this._elementsByTagName.values()) {
				for (const element of elements) {
					if (element.getAttribute("class") === className) {
						allElements.push(element);
					}
				}
			}
			return allElements;
		}
		// ID selector: "#id"
		if (selector.startsWith("#")) {
			const id = selector.slice(1);
			for (const elements of this._elementsByTagName.values()) {
				for (const element of elements) {
					if (element.getAttribute("id") === id) {
						return [element];
					}
				}
			}
			return [];
		}
		// Attribute selector: "[attr]", "[attr=value]"
		if (selector.startsWith("[") && selector.endsWith("]")) {
			const attrSelector = selector.slice(1, -1);
			/** @type {FakeElement[]} */
			const allElements = [];
			if (attrSelector.includes("=")) {
				const [attr, value] = attrSelector
					.split("=")
					.map((s) => s.trim().replaceAll(/^["']|["']$/g, ""));
				for (const elements of this._elementsByTagName.values()) {
					for (const element of elements) {
						if (element.getAttribute(attr) === value) {
							allElements.push(element);
						}
					}
				}
			} else {
				for (const elements of this._elementsByTagName.values()) {
					for (const element of elements) {
						if (element.getAttribute(attrSelector) !== undefined) {
							allElements.push(element);
						}
					}
				}
			}
			return allElements;
		}
		// Default: return empty array for unsupported selectors
		return [];
	}

	/**
	 * @param {FakeElement} element element
	 * @returns {StyleDeclaration} computed style
	 */
	getComputedStyle(element) {
		/** @type {StyleDeclaration} */
		const style = { getPropertyValue };
		const links = this.getElementsByTagName("link");
		for (const link of links) {
			if (!link.sheet) continue;
			for (const rule of link.sheet.cssRules) {
				if (rule.selectorText === element._type) {
					Object.assign(style, rule.style);
				}
			}
		}
		return style;
	}
}

class FakeElement {
	/**
	 * @param {FakeDocument} document owning document
	 * @param {string} type element type
	 * @param {string} basePath base path
	 */
	constructor(document, type, basePath) {
		this._document = document;
		this._type = type;
		/** @type {FakeElement[]} */
		this._children = [];
		/** @type {Record<string, unknown>} */
		this._attributes = Object.create(null);
		/** @type {string | undefined} */
		this._src = undefined;
		/** @type {string | undefined} */
		this._href = undefined;
		/** @type {FakeElement | undefined} */
		this.parentNode = undefined;
		this.sheet = type === "link" ? new FakeSheet(this, basePath) : undefined;
		this._textContent = "";
		this._innerHTML = "";
		/** @type {Map<string, EventHandler[]> | undefined} */
		this._eventListeners = undefined;
		/** @type {EventHandler | undefined} */
		this.onload = undefined;
	}

	get nodeName() {
		return this._type.toUpperCase();
	}

	get textContent() {
		return this._textContent;
	}

	set textContent(value) {
		this._textContent = value || "";
	}

	get innerHTML() {
		return this._innerHTML;
	}

	set innerHTML(value) {
		// FakeDocument doesn't parse HTML — the HMR DOM-patch test only
		// asserts on the raw string passed in, so storing it verbatim is
		// enough for verification.
		this._innerHTML =
			value === undefined || value === null ? "" : String(value);
	}

	/**
	 * @param {FakeElement} node node to attach
	 * @returns {void}
	 */
	_attach(node) {
		this._document._onElementAttached(node);
		this._children.push(node);
		node.parentNode = this;
	}

	/**
	 * @param {FakeElement} node node to load
	 * @returns {void}
	 */
	_load(node) {
		if (node._type === "link") {
			const timer = setTimeout(() => {
				const loadEvent = { type: "load", target: node };
				if (node.onload) node.onload(loadEvent);
				node._dispatchEvent(loadEvent);
			}, 100);
			// Don't let this cosmetic load timer keep the worker's event loop alive
			// past teardown (Deno's setTimeout returns a number, hence the guard).
			if (typeof timer.unref === "function") timer.unref();
		} else if (node._type === "script" && this._document.onScript) {
			Promise.resolve().then(() => {
				/** @type {(src: string | undefined) => void} */
				(this._document.onScript)(node.src);
			});
		}
	}

	/**
	 * @param {FakeElement} node node to insert
	 * @returns {void}
	 */
	insertBefore(node) {
		this._attach(node);
		this._load(node);
	}

	/**
	 * @param {FakeElement} node node to append
	 * @returns {void}
	 */
	appendChild(node) {
		this._attach(node);
		this._load(node);
	}

	/**
	 * @param {FakeElement} node node to remove
	 * @returns {void}
	 */
	removeChild(node) {
		const idx = this._children.indexOf(node);
		if (idx >= 0) {
			this._children.splice(idx, 1);
			this._document._onElementRemoved(node);
			node.parentNode = undefined;
		}
	}

	/**
	 * @param {string} name attribute name
	 * @param {string} value attribute value
	 * @returns {void}
	 */
	setAttribute(name, value) {
		if (this._type === "link" && name === "href") {
			this.href = value;
		} else {
			this._attributes[name] = value;
		}
	}

	/**
	 * @param {string} name attribute name
	 * @returns {void}
	 */
	removeAttribute(name) {
		delete this._attributes[name];
	}

	/**
	 * @param {string} name attribute name
	 * @returns {unknown} attribute value
	 */
	getAttribute(name) {
		if (this._type === "link" && name === "href") {
			return this.href;
		}

		return this._attributes[name];
	}

	/**
	 * @param {string} value raw url value
	 * @returns {string} resolved url
	 */
	_toRealUrl(value) {
		if (/^\//.test(value)) {
			return `https://test.cases${value}`;
		} else if (/^\.\.\//.test(value)) {
			return `https://test.cases${value.slice(2)}`;
		} else if (/^\.\//.test(value)) {
			return `https://test.cases/path${value.slice(1)}`;
		} else if (/^\w+:\/\//.test(value)) {
			return value;
		} else if (/^\/\//.test(value)) {
			return `https:${value}`;
		}

		return `https://test.cases/path/${value}`;
	}

	set src(value) {
		if (this._type === "script") {
			this._src = this._toRealUrl(/** @type {string} */ (value));
		}
	}

	get src() {
		return this._src;
	}

	set href(value) {
		if (this._type === "link") {
			this._href = this._toRealUrl(/** @type {string} */ (value));
			try {
				if (this.sheet) {
					this.sheet._css = this.sheet.css;
					this.sheet._cssRules = this.sheet.cssRules;
				}
			} catch {
				// Ignore error
			}
		}
	}

	get href() {
		return this._href;
	}

	get rel() {
		if (this._type === "link") {
			return this._attributes.rel || "stylesheet";
		}
		return this._attributes.rel;
	}

	set rel(value) {
		this._attributes.rel = value;
	}

	/**
	 * @param {string} event event name
	 * @param {EventHandler} handler handler
	 * @returns {void}
	 */
	addEventListener(event, handler) {
		if (!this._eventListeners) {
			this._eventListeners = new Map();
		}
		let handlers = this._eventListeners.get(event);
		if (handlers === undefined) {
			handlers = [];
			this._eventListeners.set(event, handlers);
		}
		handlers.push(handler);
	}

	/**
	 * @param {string} event event name
	 * @param {EventHandler} handler handler
	 * @returns {void}
	 */
	removeEventListener(event, handler) {
		if (!this._eventListeners) return;
		const handlers = this._eventListeners.get(event);
		if (!handlers) return;
		const index = handlers.indexOf(handler);
		if (index >= 0) {
			handlers.splice(index, 1);
		}
	}

	/**
	 * @param {FakeEvent} event event
	 * @returns {void}
	 */
	_dispatchEvent(event) {
		if (!this._eventListeners) return;
		const handlers = this._eventListeners.get(event.type);
		if (handlers) {
			for (const handler of handlers) {
				handler(event);
			}
		}
	}

	/**
	 * @param {boolean=} deep whether to deep-clone children
	 * @returns {FakeElement} cloned element
	 */
	cloneNode(deep = false) {
		const cloned = new FakeElement(
			this._document,
			this._type,
			this._document._basePath
		);

		// Copy attributes
		cloned._attributes = { ...this._attributes };

		// Copy src and href
		cloned._src = this._src;
		cloned._href = this._href;

		// For link elements, create a new sheet with the same href
		if (this._type === "link" && this.sheet) {
			cloned.sheet = new FakeSheet(cloned, this._document._basePath);
			if (this._href) {
				cloned.href = this._href;
			}
		}

		// Copy event handlers if they exist
		if (this.onload) {
			cloned.onload = this.onload;
		}
		// Copy event listeners
		if (this._eventListeners) {
			cloned._eventListeners = new Map();
			for (const [event, handlers] of this._eventListeners.entries()) {
				cloned._eventListeners.set(event, [...handlers]);
			}
		}

		// Deep clone children if requested
		if (deep) {
			for (const child of this._children) {
				const clonedChild = child.cloneNode(true);
				cloned.appendChild(clonedChild);
			}
		}

		return cloned;
	}
}

class FakeSheet {
	/**
	 * @param {FakeElement} element owning element
	 * @param {string} basePath base path
	 */
	constructor(element, basePath) {
		this._element = element;
		this._basePath = basePath;

		// We cannot lazily load file content in getter because in HMR scenarios,
		// the file path will have ?hmr=timestamp appended. If we load lazily,
		// we can only get the latest file content, and the previous content will be lost.
		/** @type {string | undefined} */
		this._css = undefined;
		/** @type {CssRule[] | undefined} */
		this._cssRules = undefined;
	}

	get css() {
		if (this._css) return this._css;
		let css = fs.readFileSync(
			path.resolve(
				this._basePath,
				/** @type {string} */ (this._element.href)
					.replace(/^https:\/\/test\.cases\/path\//, "")
					.replace(/^https:\/\/example\.com\//, "")
					.split("?")[0] // Remove query parameters (e.g., ?hmr=timestamp)
			),
			"utf8"
		);

		css = css.replaceAll(/@import url\("([^"]+)"\);/g, (match, url) => {
			if (!/^https:\/\/test\.cases\/path\//.test(url)) {
				return `@import url("${url}");`;
			}

			if (url.startsWith("#")) {
				return url;
			}

			return fs.readFileSync(
				path.resolve(
					this._basePath,
					url.replace(/^https:\/\/test\.cases\/path\//, "")
				),
				"utf8"
			);
		});

		return css;
	}

	get cssRules() {
		if (this._cssRules) return this._cssRules;

		const {
			TT_LEFT_CURLY_BRACKET,
			TT_RIGHT_CURLY_BRACKET,
			TT_SEMICOLON,
			readToken
		} = require("../../lib/css/syntax");

		/** @type {CssRule[]} */
		const rules = [];
		/** @type {StyleDeclaration} */
		let currentRule = { getPropertyValue };
		/** @type {string | undefined} */
		let selector;
		let last = 0;
		let ruleStart = 0; // Track the start of the current rule
		const processDeclaration = (/** @type {string} */ str) => {
			const colon = str.indexOf(":");
			if (colon > 0) {
				const property = str.slice(0, colon).trim();
				const value = str.slice(colon + 1);
				currentRule[property] = value;
			}
		};
		const href = /** @type {string} */ (this._element.href).split("?")[0]; // Remove query parameters (e.g., ?hmr=timestamp)
		const filepath = /file:\/\//.test(href)
			? new URL(href)
			: path.resolve(
					this._basePath,
					href
						.replace(/^https:\/\/test\.cases\/path\//, "")
						.replace(/^https:\/\/example\.com\/public\/path\//, "")
						.replace(/^https:\/\/example\.com\//, "")
				);
		let css = fs.readFileSync(filepath, "utf8");
		css = css
			// Remove comments
			.replaceAll(/\/\*.*?\*\//gs, "")
			.replaceAll(/@import url\("([^"]+)"\);/g, (match, url) => {
				if (!/^https:\/\/test\.cases\/path\//.test(url)) {
					return url;
				}

				if (url.startsWith("#")) {
					return url;
				}

				return fs.readFileSync(
					path.resolve(
						this._basePath,
						url.replace(/^https:\/\/test\.cases\/path\//, "")
					),
					"utf8"
				);
			});
		for (let pos = 0; ;) {
			const t = readToken(css, pos, /** @type {MutableToken} */ ({}));
			if (t === undefined) break;
			pos = t.end;
			if (t.type === TT_LEFT_CURLY_BRACKET) {
				if (selector === undefined) {
					ruleStart = last; // Record the start of the rule (before the selector)
					selector = css.slice(last, t.start).trim();
					last = t.end;
				}
			} else if (t.type === TT_RIGHT_CURLY_BRACKET) {
				processDeclaration(css.slice(last, t.start));
				rules.push({
					selectorText: selector,
					style: currentRule,
					cssText: css.slice(ruleStart, t.end).trim()
				});
				selector = undefined;
				currentRule = { getPropertyValue };
				last = t.end;
			} else if (t.type === TT_SEMICOLON) {
				processDeclaration(css.slice(last, t.start));
				last = t.end;
			}
		}
		return rules;
	}
}

/**
 * Fake CSSStyleSheet implementation for testing
 * Supports the Constructable Stylesheets API
 */
class CSSStyleSheet {
	constructor() {
		this._cssText = "";
		/** @type {CssRule[]} */
		this._cssRules = [];
	}

	/**
	 * Synchronously replace the stylesheet content
	 * @param {string} cssText CSS text content
	 */
	replaceSync(cssText) {
		this._cssText = cssText;
		this._parseCssRules(cssText);
	}

	/**
	 * Asynchronously replace the stylesheet content
	 * @param {string} cssText CSS text content
	 * @returns {Promise<CSSStyleSheet>} Promise that resolves to this stylesheet
	 */
	replace(cssText) {
		return Promise.resolve().then(() => {
			this.replaceSync(cssText);
			return this;
		});
	}

	/**
	 * Get the parsed CSS rules
	 * @returns {CssRule[]} Array of CSS rules
	 */
	get cssRules() {
		return this._cssRules;
	}

	/**
	 * Parse CSS text into rules
	 * @param {string} cssText CSS text to parse
	 */
	_parseCssRules(cssText) {
		const {
			TT_LEFT_CURLY_BRACKET,
			TT_RIGHT_CURLY_BRACKET,
			TT_SEMICOLON,
			readToken
		} = require("../../lib/css/syntax");

		/** @type {CssRule[]} */
		const rules = [];
		/** @type {StyleDeclaration} */
		let currentRule = { getPropertyValue };
		/** @type {string | undefined} */
		let selector;
		let last = 0;

		const processDeclaration = (/** @type {string} */ str) => {
			const colon = str.indexOf(":");
			if (colon > 0) {
				const property = str.slice(0, colon).trim();
				const value = str.slice(colon + 1).trim();
				currentRule[property] = value;
			}
		};

		// Remove comments
		const cleanCss = cssText.replaceAll(/\/\*.*?\*\//gs, "");

		let ruleStart = 0;

		for (let pos = 0; ;) {
			const t = readToken(cleanCss, pos, /** @type {MutableToken} */ ({}));
			if (t === undefined) break;
			pos = t.end;
			if (t.type === TT_LEFT_CURLY_BRACKET) {
				if (selector === undefined) {
					selector = cleanCss.slice(last, t.start).trim();
					ruleStart = last;
					last = t.end;
				}
			} else if (t.type === TT_RIGHT_CURLY_BRACKET) {
				processDeclaration(cleanCss.slice(last, t.start));
				last = t.end;

				// Generate cssText for the entire rule
				const ruleText = cleanCss.slice(ruleStart, t.end).trim();
				const cssText = `${selector} ${ruleText.slice(ruleText.indexOf("{"))}`;

				rules.push({
					selectorText: selector,
					style: currentRule,
					cssText
				});
				selector = undefined;
				currentRule = { getPropertyValue };
			} else if (t.type === TT_SEMICOLON) {
				processDeclaration(cleanCss.slice(last, t.start));
				last = t.end;
			}
		}

		this._cssRules = rules;
	}
}

FakeDocument.FakeSheet = FakeSheet;
FakeDocument.FakeElement = FakeDocument;
FakeDocument.CSSStyleSheet = CSSStyleSheet;

module.exports = FakeDocument;
