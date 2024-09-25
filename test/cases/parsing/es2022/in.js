export default class C {
	#x;
	constructor(x) {
		this.#x = x;
	}
	static getX(obj) {
		if (#x in obj) return obj.#x;

		return "obj must be an instance of C";
	}
}
