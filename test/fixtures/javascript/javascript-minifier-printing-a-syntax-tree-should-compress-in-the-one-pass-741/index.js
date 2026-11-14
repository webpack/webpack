console.log(typeof function () {}.valueOf(), typeof [].valueOf(), typeof {}.valueOf(), typeof (() => 1).valueOf());
console.log(typeof [f()].valueOf(), typeof a.valueOf(), typeof [].valueOf(f()), typeof "a".valueOf());
console.log(typeof [].toString(), typeof function () {}.toString());
