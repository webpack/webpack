function t1(){ let f = 1; { function f() { return 2 } } return typeof f }
function t2(){ { let f = 1; { function f(){} } return typeof f } }
function t3(x){ switch (x) { case 1: let g = 1; { function g(){} } return typeof g } }
function t4(){ for (let h of [1]) { { function h(){} } return typeof h } }
function t5(){ for (let i = 0; i < 1; i++) { { function i(){} } return typeof i } }
function t6(){ for (const j in {a: 1}) { { function j(){} } return typeof j } }
function t7(){ try { throw { a: [1, 2] } } catch ({ a: [b = 1, ...c], d: e }) { { function c(){} } return typeof c } }
function t8(){ try { throw 1 } catch (e) { let k = 1; { function k(){} } return typeof k } }
function t9(p) { { function p(){} } return typeof p }
function t10({ q }) { { function q(){} } return typeof q }
function t11() { { function s(){} } return typeof s }
function t12() { class u {} { function u(){} } return typeof u }
function t13([v = 1]) { { function v(){} } return typeof v }
function t14(...w) { { function w(){} } return typeof w }
function t15(){ for (;;) { { function z(){} } return typeof z } }
function t16(x){ switch (x) { case 1: let o; break; case 2: { function g2(){} } return typeof g2 } }
function t17(){ for (var k in {a: 1}) { { function k2(){} } return typeof k2 } }
function t18(){ try { throw 1 } catch (e) { { function e2(){} } return typeof e2 } }
function t19(){ try { throw 1 } catch (e) { var e = 2; return e } }
function t20(){ try { throw [1, 2] } catch ([, h]) { { function h(){} } return typeof h } }
function t21(){ try { throw {} } catch ({ ...r }) { { function r(){} } return typeof r } }
function t22(){ var o = {a: 1}, p = {b: 2}, a = 0, b = 0; with (o) { with (p) { return a + b } } }
console.log(t1(), t2(), t3(1), t4(), t5(), t6(), t7(), t8(), t9(1), t10({}), t11(), t12(), t13([]), t14(), t15(), t16(2), t17(), t18(), t19(), t20(), t21(), t22());