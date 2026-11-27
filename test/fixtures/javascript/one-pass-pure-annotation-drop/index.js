var log = [];
function a(v) {
	return { x: function () { return this; }, y: v };
}
function b() {
	log.push("b");
	return 2;
}
function K() {}
/*@__PURE__*/ a(1);
/*@__PURE__*/ (a(2));
(/*@__PURE__*/ a)(3);
/*@__PURE__*/ new K();
/*@__PURE__*/ a(4).x().x();
(/*@__PURE__*/ a(5)).x();
(/*@__PURE__*/ a(6)).y;
/*@__PURE__*/ a(b());
label: /*@__PURE__*/ a(7);
if (log.length > 100) /*@__PURE__*/ a(8);
/*! kept */ /*@__PURE__*/ a(9);
var kept = /*@__PURE__*/ a(10);
console.log(log.join(), kept.y, b());
