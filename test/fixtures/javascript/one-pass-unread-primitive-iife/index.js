var log = [];
var b = {
	valueOf: function () {
		log.push("valueOf");
		return 1;
	}
};
+(function () {
	return 1;
})(log.push(1));
-(function () {
	return "x";
})(log.push(2));
~(function (a) {
	return a;
})(2, log.push(3));
+(function (a, c) {
	return c;
})(1, log.push(4));
+(function (a) {
	return a;
})(b, log.push(5));
+(function () {
	return b;
})(log.push(6));
try {
	+(function () {
		return 1n;
	})(log.push(7));
} catch (e) {
	log.push(e.name);
}
+(function* () {
	return 1;
})(log.push(8));
+(async function () {
	return 1;
})(log.push(9));
console.log(log.join());
