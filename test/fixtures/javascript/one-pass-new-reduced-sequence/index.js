function Made() {
	this.value = 1;
}
function pick(label) {
	console.log("pick", label);
	return Made;
}
function make(skip) {
	return new ((function (value) {
		return value;
	})((skip, pick("make"))))();
}
console.log(make(pick).value, pick("again") === Made);
