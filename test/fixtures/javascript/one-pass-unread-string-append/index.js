function repeat(count) {
	var text = "";
	console.log("repeat", count);
	for (var i = 0; i < count; i++) text += "x";
	text += "-";
}
repeat(3);

function kept(count) {
	var text = "";
	text += "y";
	return text + count;
}
console.log(kept(1));

function converted(value) {
	var text = value;
	text += "z";
	console.log("converted");
}
converted({
	toString: function () {
		console.log("toString");
		return "";
	}
});

function closure() {
	var text = "";
	text += "w";
	return function () {
		return text;
	};
}
console.log(closure()());

var global = "";
global += "1";
console.log("global");
