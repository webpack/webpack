
const top = 1;
let alsoTop = 2;
({ top: alsoTop } = { top: 1 });
using alsoUsing = { [Symbol.dispose]() {} };
class TopClass {}
export const exported = 3;
export default class DefaultClass {}
{ const inBlock = 4; class InBlock {} }
if (top) { let inIf = 5; } else { const inElse = 6; }
for (const inFor of [top]) { let inForOfBody = 7; }
for (let index = 0; index < 1; index++) { const inForBody = 8; }
for (const key in {}) { let inForInBody = 9; }
while (top) { const inWhile = 10; }
do { let inDoWhile = 11; } while (top);
label: { const inLabeled = 12; }
try { const inTry = 13; } catch (error) { let inCatch = 14; } finally { const inFinally = 15; }
switch (top) { case 1: { const inCaseBlock = 16; } case 2: let inCase = 17; break; default: const inDefault = 18; }
function fn() { const inFunction = 19; }
class WithStatic { static { const inStaticBlock = 20; } }
