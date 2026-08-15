"use strict";

var A = (module.exports = {
	a: function () {},
	b: function () {
		A.a();
		return true;
	}
});
