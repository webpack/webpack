function dropsVar() { var unused = 1; "use strict"; return this === undefined; }
function dropsFunction() { function unused() {} "use strict"; return this === undefined; }
function dropsTryFinally() { try { var unused; } finally { } "use strict"; return this === undefined; }
function dropsTryCatch() { try { } catch (error) { } "use strict"; return this === undefined; }
console.log(dropsVar(), dropsFunction(), dropsTryFinally(), dropsTryCatch());
