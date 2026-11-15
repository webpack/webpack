var obj = { class: 4, function: 6 }, x;
x = (obj?.class) / 2;
x = (obj?.function) / 2;
x = obj?.class / 2 / 1;
x = obj?.function / 2 / 1;
x = [obj?.class] / 2;
x = { a: obj?.function } / 2;
x = (obj.class) / 2;
