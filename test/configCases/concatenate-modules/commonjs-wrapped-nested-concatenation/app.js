global.__nestedConcatOrder = (global.__nestedConcatOrder || []).concat("app");

export function start() {
	return require("./feature").render();
}
