function Made() {
	console.log("Made constructed");
}
var pick = () => {
	console.log("pick ran");
	return Made;
};
function build() {
	new (function (value) {
		return value;
	})(pick());
	console.log("built");
}
function keep() {
	var made = new (function (value) {
		return value;
	})(pick());
	console.log(typeof made, made === Made);
}
build();
keep();
