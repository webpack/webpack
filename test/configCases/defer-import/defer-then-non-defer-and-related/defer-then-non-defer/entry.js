import { order } from "./order";
import './0.js';
import './1.js';
import './a.js';
import './b.js';
import { next } from "./a.js";

const expected = "0 deferred 1 a deferred.1 b";
if (order.join(' ') !== expected) {
	throw new Error(
		`Expected order to be "${expected}", but got "${order.join(' ')}"`
	);
}

next();
