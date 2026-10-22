import * as deferred from /* webpackDefer: true */ './deferred.1.js';
import { order } from './order.js';
order.push(['a', deferred][0]);

export function next() {
	if (typeof avoidAnalyze(deferred).then !== 'undefined') {
		throw new Error('deferred should be a deferred namespace object.');
	}
}
function avoidAnalyze(params) {
	return params;
}
