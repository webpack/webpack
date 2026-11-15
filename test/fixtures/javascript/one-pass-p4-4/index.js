function noSSR(initializer, options) {
	delete options.webpack;
	delete options.modules;
	if (!false) {
		return initializer(options);
	}
	var loading = options.loading;
	return function () {
		return loading;
	};
}
function log(value) {
	console.log(Object.keys(value).join());
	return value;
}
console.log(noSSR(log, { webpack: 1, modules: 2, loading: 3 }).loading);
function elseKept(options) {
	log(options);
	if (0) return 1;
	else return options.loading;
}
console.log(elseKept({ loading: 4 }));
function several(options) {
	log(options);
	if (1) {
		log(options);
		return options.loading;
	}
}
console.log(several({ loading: 5 }));
function nothing(options) {
	log(options);
	if (1) return;
	return options.loading;
}
console.log(nothing({ loading: 6 }));
function hoisted(options) {
	log(options);
	if (0) {
		var kept = 1;
	}
	return kept;
}
console.log(hoisted({ loading: 7 }));
function branchless(options) {
	log(options);
	if (0) return 1;
	return options.loading;
}
console.log(branchless({ loading: 8 }));
