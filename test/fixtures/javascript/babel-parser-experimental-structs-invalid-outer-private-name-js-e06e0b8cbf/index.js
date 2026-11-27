class C {
  static {
    struct S {
      static #privateProperty;
    }
    #privateProperty in S;
  }
}
