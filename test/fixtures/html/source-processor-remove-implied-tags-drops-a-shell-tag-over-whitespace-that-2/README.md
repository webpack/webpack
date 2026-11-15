drops a shell tag over whitespace that prints nothing

Whitespace inside `<head>`, or behind `</head>`, sits outside every

block formatting context, so no tier prints it and no tag guards it.
