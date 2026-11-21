
var target;
try { var fromTryOnly = 1; } finally { }
try { var fromTryCaught = 1; } catch (error) { }
for (; target; ) { var fromBareFor = 1; }
for (target in { }) { var fromForInTarget = 1; }
for (target of [ ]) { var fromForOfTarget = 1; }
