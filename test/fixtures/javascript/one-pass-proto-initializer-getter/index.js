var hits = 0;
({
	__proto__: {
		get x() {
			hits++;
			return 1;
		}
	}
})?.x;
({
	__proto__: {
		get y() {
			hits++;
			return 1;
		}
	}
}).y;
({ "__proto__": { get z() { hits++; return 1; } } }).z;
({ __proto__: null, a: 1 })?.a;
({ a: 1 }).a;
try {
	({
		__proto__: {
			get t() {
				throw new Error("thrown");
			}
		}
	})?.t;
} catch (e) {
	console.log(e.message);
}
console.log(hits);
