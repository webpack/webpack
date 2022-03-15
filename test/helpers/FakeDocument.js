const fs = require("fs");
const path = require("path");

const getPropertyValue = function (property) {
	return this[property];
};

module.exports = class FakeDocument {
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
		let list = this._elementsByTagName.get(type);
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
};

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

	appendChild(node) {
		this._document._onElementAttached(node);
		this._children.push(node);
		node.parentNode = this;
		if (node._type === "link") {
			setTimeout(() => {
				if (node.onload) node.onload({ type: "load", target: node });
			}, 100);
		}
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
		this._attributes[name] = value;
	}

	removeAttribute(name) {
		delete this._attributes[name];
	}

	getAttribute(name) {
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
		} else {
			return `https://test.cases/path/${value}`;
		}
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
		}
	}

	get href() {
		return this._href;
	}
}

class FakeSheet {
	constructor(element, basePath) {
		this._element = element;
		this._basePath = basePath;
	}

	get cssRules() {
		const walkCssTokens = require("../../lib/css/walkCssTokens");
		const rules = [];
		let currentRule = { getPropertyValue };
		let selector = undefined;
		let last = 0;
		const processDeclaration = str => {
			const colon = str.indexOf(":");
			if (colon > 0) {
				const property = str.slice(0, colon).trim();
				const value = str.slice(colon + 1);
				currentRule[property] = value;
			}
		};
		let css = fs.readFileSync(
			path.resolve(
				this._basePath,
				this._element.href.replace(/^https:\/\/test\.cases\/path\//, "")
			),
			"utf-8"
		);
		css = css.replace(/@import url\("([^"]+)"\);/g, (match, url) => {
			return fs.readFileSync(
				path.resolve(
					this._basePath,
					url.replace(/^https:\/\/test\.cases\/path\//, "")
				),
				"utf-8"
			);
		});
		walkCssTokens(css, {
			isSelector() {
				return selector === undefined;
			},
			leftCurlyBracket(source, start, end) {
				if (selector === undefined) {
					selector = source.slice(last, start).trim();
					last = end;
				}
				return end;
			},
			rightCurlyBracket(source, start, end) {
				processDeclaration(source.slice(last, start));
				last = end;
				rules.push({ selectorText: selector, style: currentRule });
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
		return rules;
	}
}
