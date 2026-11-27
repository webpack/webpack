export struct S extends B {
  property = 0;
  method() {}
  #private = "";
  #PrivateMethod() {}

  static staticProperty;
  static staticMethod() {}
  static #staticPrivate;
  static #staticPrivateMethod() {}

  [computedMethod]() {};
  [computedProperty];

  get accessor() {}
  set accessor(value) {}

  static {}
}
