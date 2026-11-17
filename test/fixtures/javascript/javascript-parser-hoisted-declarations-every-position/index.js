
var top = 1;
function topFunction() {}
class TopClass {}
if (top) { var fromIf = 1; } else { var fromElse = 2; }
for (var fromFor = 0; fromFor < 1; fromFor++) { var fromForBody = 1; }
for (var fromForIn in top) { var fromForInBody = 1; }
for (var fromForOf of [top]) { var fromForOfBody = 1; }
while (top) { var fromWhile = 1; }
do { var fromDoWhile = 1; } while (top);
label: { var fromLabeled = 1; }
with (top) { var fromWith = 1; }
try { var fromTry = 1; } catch (error) { var fromCatch = 1; } finally { var fromFinally = 1; }
switch (top) { case 1: var fromCase = 1; break; default: var fromDefault = 1; }
{ var fromBlock = 1; function blockFunction() {} }
let lexical = 1;
const alsoLexical = 1;
function outer() { var inOuter = 1; }
