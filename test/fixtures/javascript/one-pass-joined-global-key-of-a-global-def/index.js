(function () {
	var o = { NaN: 1 };
	o[NaN] = 2;
	console.log(JSON.stringify(o));
})();
