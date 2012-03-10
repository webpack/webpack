module.exports = function(module) {
	var replaces = []; // { from: 123, to: 125, value: "4" }
	function genReplaceRequire(requireItem) {
		if(requireItem.nameRange && requireItem.id !== undefined) {
			replaces.push({
				from: requireItem.nameRange[0],
				to: requireItem.nameRange[1],
				value: "" + requireItem.id
			});
		}
	}
	if(module.requires) {
		module.requires.forEach(genReplaceRequire);
	}
	if(module.asyncs) {
		module.asyncs.forEach(function genReplacesAsync(asyncItem) {
			if(asyncItem.requires) {
				asyncItem.requires.forEach(genReplaceRequire);
			}
			if(asyncItem.asyncs) {
				asyncItem.asyncs.forEach(genReplacesAsync);
			}
			if(asyncItem.namesRange) {
				replaces.push({
					from: asyncItem.namesRange[0],
					to: asyncItem.namesRange[1],
					value: ((asyncItem.chunkId || "0") + "")
				});
			}
		});
	}
	replaces.sort(function(a, b) {
		return b.from - a.from;
	});
	var source = module.source;
	var result = [source];
	replaces.forEach(function(repl) {
		var remSource = result.shift();
		result.unshift(
			remSource.substr(0, repl.from),
			repl.value,
			remSource.substr(repl.to+1)
		);
	});
	return result.join("");
}