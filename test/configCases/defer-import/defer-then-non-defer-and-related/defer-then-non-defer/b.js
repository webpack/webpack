import * as ns from './deferred.1.js';
import { order } from './order.js';
order.push(['b', ns][0]);
if (typeof avoidAnalyze(ns).then === 'undefined') {
	throw new Error('ns should not be a deferred namespace object.');
}
function avoidAnalyze(params) {
	return params;
}
