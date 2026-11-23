var log = [];
function value(v) {
	log.push(v);
	return v;
}
function pick(anything) {
	console.log("0" + anything ? "yes" : "no");
	console.log(anything + "0" ? "Yes" : "No");
	if (value("x") + "!") log.push("then");
	else log.push("else");
}
pick({
	toString: function () {
		log.push("toString");
		return "";
	}
});
try {
	console.log(
		"0" +
			(function () {
				throw "nope";
			})()
			? "yes"
			: "no"
	);
} catch (e) {
	console.log(e);
}
console.log(log.join());
