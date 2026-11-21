switch (x) { case 1: f(); break; case 2: f(); break; case 3: g(); }
switch (x) { case "a": f(); break; default: f(); break; case 3: g(); }
function a() { switch (x) { case 1: return 1; case 2: return 1; case 3: return 2; } }
switch (x) { case 1: f(); case 2: f(); break; case 3: g(); }
switch (x) { case 1: f(); break; case 2: f(); }
switch (x) { case 1: f(); break; case 2: f(); case 3: g(); }
switch (x) { case 1: f(); break; case 2: /* kept */ f(); break; case 3: g(); }
switch (x) { case 1: break; case 2: break; case 3: g(); }
switch (x) { case 1: f(); case 2: f(); case 3: g(); }
switch (x) { case 1: f(); break; case 2: f(); case 3: case 4: default: g(); }
