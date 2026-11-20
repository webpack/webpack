function f(t){if(t)console.log("a",t);else return;console.log("b")}f(0);f(1);
function g(t){try{if(t)console.log("c");else return;console.log("d")}finally{console.log("fin")}}g(0);g(1);
for(var i=0;i<4;i++){if(i%2)console.log("e",i);else continue;console.log("f",i)}
l:{if(i>9)console.log("g");else break l;console.log("h")}console.log("i");
m:{if(i<9)console.log("j");else break m;console.log("k")}
o:for(var j=0;j<3;j++){if(j)console.log("x",j);else continue o;console.log("y")}
function*h(t){if(t)yield 1;else return;yield 2}console.log([...h(0)],[...h(1)]);
function q(t){if(t){console.log("q1");console.log("q2")}else return;console.log("q3");console.log("q4")}q(1);q(0);
var r=function(t){if(t)console.log("r");else return void 0;console.log("s")};r(0);r(1);
p:{switch(1){case 1:if(i)console.log("sw");else break p;console.log("sw2")}console.log("after")}
