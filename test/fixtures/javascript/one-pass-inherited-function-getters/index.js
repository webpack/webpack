var hits = 0;
Object.defineProperty(Function.prototype, "x", {
	configurable: true,
	get: function () {
		hits++;
		return 1;
	}
});
function declared() {}
declared.x;
class Plain {}
Plain.x;
const arrow = () => 1;
arrow.x;
var expression = function () {};
expression.x;
var object = {};
object.x;
console.log(hits);
delete Function.prototype.x;
