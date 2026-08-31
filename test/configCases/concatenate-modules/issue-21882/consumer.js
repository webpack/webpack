export function render() {
	return {
		url: require("./a.svg"),
		whole: require("./data.js"),
		foo: require("./data.js").foo,
		def: require("./data.js").default
	};
}
