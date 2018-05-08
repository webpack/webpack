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
	constructor(type, autoload = true) {
		this._type = type;
		this._autoload = autoload;
		this._children = [];
		this._attributes = Object.create(null);
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

	get onload() {
		return this._onload;
	}

	set onload(script) {
		if (this._autoload === true && typeof script === "function") {
			script();
		}
		this._onload = script;
	}

	get src() {
		return this._src;
	}

	set src(src) {
		// eslint-disable-next-line no-undef
		const publicPath = __webpack_public_path__;
		eval(`
			const path = require('path');
			const fs = require('fs');
			const content = fs.readFileSync(
				path.join(__dirname, '${src}'.replace('${publicPath}', '')), "utf-8"
			)
			eval(content);
		`);
		this._src = src;
	}
}
