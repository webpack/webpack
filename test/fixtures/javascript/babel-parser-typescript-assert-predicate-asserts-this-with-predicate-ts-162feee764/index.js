class Foo {
  isBar(): asserts this is Foo {}
  isBaz = (): asserts this is Foo => {}
}
