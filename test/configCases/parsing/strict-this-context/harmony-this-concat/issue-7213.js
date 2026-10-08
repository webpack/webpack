// This helper is taken from Babel
function _newArrowCheck(innerThis, boundThis) {
	if (innerThis !== boundThis) {
		throw new TypeError("Cannot instantiate an arrow function");
	}
}

let _this = this;
export let bindThis = function() {
	_newArrowCheck(this, _this);
	return this
}.bind(this);

export let callThis = function() {
	return this
}.call(this)

export let applyThis = function() {
	return this
}.apply(this)
