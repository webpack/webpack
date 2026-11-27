("use strict");

"use strict".foo;
"use strict"[foo];
"use strict"`foo`;
"use strict"(foo);
"use strict"
  .foo;
"use strict"
  [foo];
"use strict"
  `foo`;
"use strict"
  (foo);

// Should not be a syntax error because should not be parsed in strict mode.
"\5";

function f(){
  "use strict".foo;
  "\5";
}

function f(){
  "use strict"[foo];
  "\5";
}

function f(){
  "use strict"`foo`;
  "\5";
}

function f(){
  "use strict"(foo);
  "\5";
}

function f(){
  "use strict"
  .foo;
  "\5";
}

function f(){
  "use strict"
  [foo];
  "\5";
}

function f(){
  "use strict"
  `foo`;
  "\5";
}

function f(){
  "use strict"
  (foo);
  "\5";
}

function f(){
  foo();
  "use strict".bar;
  "\5";
}

function f(){
  foo();
  "use strict"[bar];
  "\5";
}

function f(){
  foo();
  "use strict"`bar`;
  "\5";
}

function f(){
  foo();
  "use strict"(bar);
  "\5";
}

function f(){
  foo();
  "use strict"
  .bar;
  "\5";
}

function f(){
  foo();
  "use strict"
  [bar];
  "\5";
}

function f(){
  foo();
  "use strict"
  `bar`;
  "\5";
}

function f(){
  foo();
  "use strict"
  (bar);
  "\5";
}

function f(){
  05;
  "use strict";
}
