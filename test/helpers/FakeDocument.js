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
}
