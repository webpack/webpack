// `Object.keys` of a computed key a name nothing sets reads keys `undefined`.
console.log(
	(function () {
		var unsetName;
		return Object.keys({ [unsetName]: 1 });
	})()
);
