// A value read once folds into an object literal past property values that
// run nothing, as it already does past array elements.
function timing(base, startDts, startPts, endDts) {
	var ptsOffset = startPts - startDts;
	var decodeDuration = endDts - startDts;
	return {
		start: { dts: base, pts: base + ptsOffset },
		end: { dts: base + decodeDuration },
		base: base
	};
}
// A value that runs code stays before what reads it.
var count = 0;
function bump(o) {
	var before = o.k++;
	return { after: o.k, before: before, count: ++count };
}
console.log(JSON.stringify(timing(1, 2, 5, 9)), JSON.stringify(bump({ k: 1 })));
