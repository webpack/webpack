class C<T extends Foo> {}

function F<T extends Foo>() {}

interface I<T extends Foo> {}

type T<P extends Foo> = I<P>;
