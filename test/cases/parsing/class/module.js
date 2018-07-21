class A {
	constructor() {
		this.a = require("./a");
	}
}

const B = class {
	constructor() {
		this.a = require("./a");
	}
};

export default class {
	constructor() {
		this.a = require("./a");
	}
};

export {
	A,
	B
};
