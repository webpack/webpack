"use strict";

const fs = require("fs");
const path = require("path");

/**
 * @this {FakeDocument}
 * @param {string} property property
 * @returns {EXPECTED_ANY} value
 */
function getPropertyValue(property) {
	return this[property];
}

class FakeDocument {
	constructor(basePath) {
		this.head = this.createElement("head");
		this.body = this.createElement("body");
		this.baseURI = "https://test.cases/path/index.html";
		this._elementsByTagName = new Map([
			["head", [this.head]],
			["body", [this.body]]
		]);
		this._basePath = basePath;
	}

	createElement(type) {
		return new FakeElement(this, type, this._basePath);
	}

	_onElementAttached(element) {
		const type = element._type;
		let list = this._elementsByTagName.get(type);
		if (list === undefined) {
			list = [];
			this._elementsByTagName.set(type, list);
		}
		list.push(element);
	}

	_onElementRemoved(element) {
		const type = element._type;
		const list = this._elementsByTagName.get(type);
		const idx = list.indexOf(element);
		list.splice(idx, 1);
	}

	getElementsByTagName(name) {
		return this._elementsByTagName.get(name) || [];
	}

	getComputedStyle(element) {
		const style = { getPropertyValue };
		const links = this.getElementsByTagName("link");
		for (const link of links) {
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
	constructor(document, type, basePath) {
		this._document = document;
		this._type = type;
		this._children = [];
		this._attributes = Object.create(null);
		this._src = undefined;
		this._href = undefined;
		this.parentNode = undefined;
		this.sheet = type === "link" ? new FakeSheet(this, basePath) : undefined;
	}

	_attach(node) {
		this._document._onElementAttached(node);
		this._children.push(node);
		node.parentNode = this;
	}

	_load(node) {
		if (node._type === "link") {
			setTimeout(() => {
				if (node.onload) node.onload({ type: "load", target: node });
			}, 100);
		} else if (node._type === "script" && this._document.onScript) {
			Promise.resolve().then(() => {
				this._document.onScript(node.src);
			});
		}
	}

	insertBefore(node) {
		this._attach(node);
		this._load(node);
	}

	appendChild(node) {
		this._attach(node);
		this._load(node);
	}

	removeChild(node) {
		const idx = this._children.indexOf(node);
		if (idx >= 0) {
			this._children.splice(idx, 1);
			this._document._onElementRemoved(node);
			node.parentNode = undefined;
		}
	}

	setAttribute(name, value) {
		if (this._type === "link" && name === "href") {
			this.href(value);
		} else {
			this._attributes[name] = value;
		}
	}

	removeAttribute(name) {
		delete this._attributes[name];
	}

	getAttribute(name) {
		if (this._type === "link" && name === "href") {
			return this.href;
		}

		return this._attributes[name];
	}

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
			this._src = this._toRealUrl(value);
		}
	}

	get src() {
		return this._src;
	}

	set href(value) {
		if (this._type === "link") {
			this._href = this._toRealUrl(value);
			try {
				this.sheet._css = this.sheet.css;
				this.sheet._cssRules = this.sheet.cssRules;
			} catch (_error) {
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
}

class FakeSheet {
	constructor(element, basePath) {
		this._element = element;
		this._basePath = basePath;

		// We cannot lazily load file content in getter because in HMR scenarios,
		// the file path will have ?hmr=timestamp appended. If we load lazily,
		// we can only get the latest file content, and the previous content will be lost.
		this._css = undefined;
		this._cssRules = undefined;
	}

	get css() {
		if (this._css) return this._css;
		let css = fs.readFileSync(
			path.resolve(
				this._basePath,
				this._element.href
					.replace(/^https:\/\/test\.cases\/path\//, "")
					.replace(/^https:\/\/example\.com\//, "")
					.split("?")[0] // Remove query parameters (e.g., ?hmr=timestamp)
			),
			"utf8"
		);

		css = css.replace(/@import url\("([^"]+)"\);/g, (match, url) => {
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

		const walkCssTokens = require("../../lib/css/walkCssTokens");

		const rules = [];
		let currentRule = { getPropertyValue };
		let selector;
		let last = 0;
		let ruleStart = 0; // Track the start of the current rule
		const processDeclaration = (str) => {
			const colon = str.indexOf(":");
			if (colon > 0) {
				const property = str.slice(0, colon).trim();
				const value = str.slice(colon + 1);
				currentRule[property] = value;
			}
		};
		const href = this._element.href.split("?")[0]; // Remove query parameters (e.g., ?hmr=timestamp)
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
			// @ts-expect-error we use es2018 for such tests
			.replace(/\/\*.*?\*\//gs, "")
			.replace(/@import url\("([^"]+)"\);/g, (match, url) => {
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
		walkCssTokens(css, 0, {
			leftCurlyBracket(source, start, end) {
				if (selector === undefined) {
					ruleStart = last; // Record the start of the rule (before the selector)
					selector = source.slice(last, start).trim();
					last = end;
				}
				return end;
			},
			rightCurlyBracket(source, start, end) {
				processDeclaration(source.slice(last, start));
				rules.push({
					selectorText: selector,
					style: currentRule,
					cssText: source.slice(ruleStart, end).trim()
				});
				selector = undefined;
				currentRule = { getPropertyValue };
				last = end;
				return end;
			},
			semicolon(source, start, end) {
				processDeclaration(source.slice(last, start));
				last = end;
				return end;
			}
		});
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
	 * @returns {Array} Array of CSS rules
	 */
	get cssRules() {
		return this._cssRules;
	}

	/**
	 * Parse CSS text into rules
	 * @param {string} cssText CSS text to parse
	 */
	_parseCssRules(cssText) {
		const walkCssTokens = require("../../lib/css/walkCssTokens");

		const rules = [];
		let currentRule = { getPropertyValue };
		let selector;
		let last = 0;

		const processDeclaration = (str) => {
			const colon = str.indexOf(":");
			if (colon > 0) {
				const property = str.slice(0, colon).trim();
				const value = str.slice(colon + 1).trim();
				currentRule[property] = value;
			}
		};

		// Remove comments
		const cleanCss = cssText
			// @ts-expect-error we use es2018 for such tests
			.replace(/\/\*.*?\*\//gs, "");

		let ruleStart = 0;

		walkCssTokens(cleanCss, 0, {
			leftCurlyBracket(source, start, end) {
				if (selector === undefined) {
					selector = source.slice(last, start).trim();
					ruleStart = last;
					last = end;
				}
				return end;
			},
			rightCurlyBracket(source, start, end) {
				processDeclaration(source.slice(last, start));
				last = end;

				// Generate cssText for the entire rule
				const ruleText = cleanCss.slice(ruleStart, end).trim();
				const cssText = `${selector} ${ruleText.slice(ruleText.indexOf("{"))}`;

				rules.push({
					selectorText: selector,
					style: currentRule,
					cssText
				});
				selector = undefined;
				currentRule = { getPropertyValue };
				return end;
			},
			semicolon(source, start, end) {
				processDeclaration(source.slice(last, start));
				last = end;
				return end;
			}
		});

		this._cssRules = rules;
	}
}

FakeDocument.FakeSheet = FakeSheet;
FakeDocument.FakeElement = FakeDocument;
FakeDocument.CSSStyleSheet = CSSStyleSheet;

module.exports = FakeDocument;
