class Foo {
  #x = 1;
  test() {
    class X extends (#x in {}) {};
  }
}
