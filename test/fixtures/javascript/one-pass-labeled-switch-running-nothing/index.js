var log=[];
function a(x){A:switch(1){case 2:x();break A}log.push("a")}
function b(x){A:switch(1){case 1:log.push("b1");break A;case 2:x()}log.push("b")}
function c(x){A:switch(2){default:log.push("cd");case 1:break A}log.push("c")}
function d(x){if(x)A:switch(1){case 2:x()}log.push("d")}
function e(x){A:B:switch(1){case 2:x();break A}log.push("e")}
function f(x){A:switch(g()){case 2:x()}log.push("f")}
function g(){log.push("g");return 1}
function h(x){for(var i=0;i<2;i++){A:switch(1){case 2:continue}log.push("h"+i)}}
function k(x){A:switch(1){case 2:var v=1}log.push(typeof v)}
a(1);b(1);c(1);d(1);d(0);e(1);f(1);g();h(1);k(1);
console.log(log.join());
