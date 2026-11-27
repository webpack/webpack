class C extends (B<T> as D)<T> {}
class C1 extends (B<Array<T>> as D) {}
class C2 extends (B<T[]> as D) {}
class C3 extends (B<T> satisfies D) {}
