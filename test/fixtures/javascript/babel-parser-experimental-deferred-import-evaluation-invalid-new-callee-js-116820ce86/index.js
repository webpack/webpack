new import.defer("foo")

new import.defer("foo").bar;
new import.defer("foo")[bar];
new import.defer("foo")`bar`;
new import.defer("foo").bar(qux);
new import.defer("foo")[bar](qux);
new import.defer("foo")`bar`(qux);
