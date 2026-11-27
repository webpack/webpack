// A constant property folds off an object kept for its other values: one
// holding a function no `this` reaches, called off it, or an assignment.
var log = [];
function make() {
	var helper;
	var ERRORS = {
		TIMEOUT: -101,
		ABORTED: -102,
		describe: function (code) {
			return "code " + code;
		},
		later: (helper = function () {
			return "later";
		})
	};
	return [
		function (error) {
			return error.code === ERRORS.TIMEOUT;
		},
		function (error) {
			return ERRORS.ABORTED < error.code ? ERRORS.describe(error.code) : "";
		},
		helper
	];
}
// A function reading `this` keeps every read off the object.
function keep() {
	var COUNTS = {
		LIMIT: 1000,
		get: function () {
			return this.LIMIT;
		}
	};
	return [
		function (value) {
			return value > COUNTS.LIMIT;
		},
		function () {
			return COUNTS.get();
		}
	];
}
var made = make();
var kept = keep();
log.push(made[0]({ code: -101 }), made[1]({ code: 7 }), made[2](), kept[0](2000), kept[1]());
console.log(log.join());
