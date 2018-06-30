module.exports = class FakeDocument {
	constructor() {
		this.head = this.createElement("head");
	}

	createElement(type) {
		return new FakeElement(type);
	}

	getElementsByTagName(name) {
		if (name === "head") return [this.head];
		throw new Error(
			`FakeDocument.getElementsByTagName(${name}): not implemented`
		);
	}
};

class FakeElement {
	constructor(type) {
		this._type = type;
		this._children = [];
		this._attributes = Object.create(null);
		this._src = undefined;
		this._href = undefined;
	}

	appendChild(node) {
		this._children.push(node);
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
