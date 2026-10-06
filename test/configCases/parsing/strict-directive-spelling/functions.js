// Each function hides `g` in a dead block: a sloppy one hoists it as a `var`, a
// strict one does not, and webpack must keep exactly that when dropping the block.
function strictDouble() { "use strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function strictSingle() { 'use strict'; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function afterCustom() { "custom"; "use strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function repeated() { ""; "custom"; "use strict"; "use strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function afterExpression() { 0; "use strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function afterParenthesized() { ("custom"); "use strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function escapedAfterCustom() { "custom"; "use\x20strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function parenthesized() { ("use strict"); if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function escaped() { "use\x20strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }
function continued() { "use \
strict"; if (false) { function g() {} } try { g; return true; } catch (_e) { return false; } }

// `true` where `g` stayed hoisted, i.e. the function is sloppy
module.exports = {
	strictDouble: strictDouble(),
	strictSingle: strictSingle(),
	afterCustom: afterCustom(),
	repeated: repeated(),
	afterExpression: afterExpression(),
	afterParenthesized: afterParenthesized(),
	escapedAfterCustom: escapedAfterCustom(),
	parenthesized: parenthesized(),
	escaped: escaped(),
	continued: continued()
};
