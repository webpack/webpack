function show(value) {
	return value.name;
}
function declared() {
	var made = function () {};
	return show(made);
}
function classes() {
	var made = class {};
	return made.name;
}
function arrows() {
	var made = () => 1;
	return [made][0].name;
}
function properties() {
	var made = function () {};
	return { other: made }.other.name;
}
function called() {
	var made = function () {
		return "called";
	};
	return made();
}
function tagged() {
	var made = (parts) => parts[0];
	return made`tagged`;
}
function callee() {
	var made = function () {
		return arguments.callee.name;
	};
	return made();
}
function staticName() {
	var made = class {
		static {
			console.log("static", this.name);
		}
	};
	try {
		made();
	} catch (error) {
		return error.constructor.name;
	}
}
console.log(declared(), classes(), arrows(), properties(), called(), tagged(), callee(), staticName());
