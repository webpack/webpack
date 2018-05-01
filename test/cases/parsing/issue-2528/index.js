import { foo } from './module';
import impA from "./helperA";
import impB from "./helperB";
import impC from "./helperC";

var notExportedAsync = function () {
	var ref = impA(impB.mark(function _callee2() {
		return impC.wrap(function _callee2$(_context2) {
			while (1) {
				switch (_context2.prev = _context2.next) {
					case 0:
						foo();

					case 1:
					case 'end':
						return _context2.stop();
				}
			}
		}, _callee2, this);
	}));

	return function notExportedAsync() {
		return ref.apply(this, arguments);
	};
}();

export var exportedAsync = function () {
	var ref = impA(impB.mark(function _callee() {
		return impC.wrap(function _callee$(_context) {
			while (1) {
				switch (_context.prev = _context.next) {
					case 0:
						_context.next = 2;
						return foo();

					case 2:
					case 'end':
						return _context.stop();
				}
			}
		}, _callee, this);
	}));

	return function exportedAsync() {
		return ref.apply(this, arguments);
	};
}();

import { count } from "./module";

it("should run async functions", function() {
	var org = count;
	notExportedAsync();
	expect(count).toBe(org + 1);
	exportedAsync();
	expect(count).toBe(org + 2);
});
