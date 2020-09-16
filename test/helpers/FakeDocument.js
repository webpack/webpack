module.exports = class FakeDocument {
	constructor() {
		this.head = this.createElement("head");
		this.baseURI = "https://test.cases/path/index.html";
		this._elementsByTagName = new Map([["head", [this.head]]]);
	}

	createElement(type) {
		return new FakeElement(this, type);
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
};

class FakeElement {
	constructor(document, type) {
		this._document = document;
		this._type = type;
		this._children = [];
		this._attributes = Object.create(null);
		this._src = undefined;
		this._href = undefined;
		this.parentNode = undefined;
	}

	appendChild(node) {
		this._document._onElementAttached(node);
		this._children.push(node);
		node.parentNode = this;
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

	getAttribute(name) {
		return this._attributes[name];
	}

	_toRealUrl(value) {
		if (/^\//.test(value)) {
			return `https://test.cases${value}`;
		} else if (/^\.\.\//.test(value)) {
			return `https://test.cases${value.substr(2)}`;
		} else if (/^\.\//.test(value)) {
			return `https://test.cases/path${value.substr(1)}`;
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
