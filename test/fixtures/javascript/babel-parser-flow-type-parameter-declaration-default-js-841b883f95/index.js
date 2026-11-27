type A1<T = string> = T
type A2<T = *> = T
type A3<T: ?string = string> = T
type A4<S, T: ?string = string> = T
type A5<S = number, T: ?string = string> = T
class A6<T = string> {}
class A7<T: ?string = string> {}
class A8<S, T: ?string = string> {}
class A9<S = number, T: ?string = string> {}
;(class A10<T = string> {})
;(class A11<T: ?string = string> {})
;(class A12<S, T: ?string = string> {})
;(class A13<S = number, T: ?string = string> {})
declare class A14<T = string> {}
declare class A15<T: ?string = string> {}
declare class A16<S, T: ?string = string> {}
declare class A17<S = number, T: ?string = string> {}
interface A18<T = string> {}
interface A19<T: ?string = string> {}
interface A20<S, T: ?string = string> {}
interface A21<S = number, T: ?string = string> {}
type A22<T = void> = T
function A26<T = string>() {}
;({ A28<T = string>() {} });
class A29 {
  foo<T = string>() {}
}
;(class A30 {
  foo<T = string>() {}
});
declare class A31 { foo<T = string>(): void }
<T = string>() => 123;