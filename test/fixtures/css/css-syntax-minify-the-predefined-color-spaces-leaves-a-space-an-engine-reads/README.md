Chromium takes a98-rgb's gamma as 2.2 rather than 563/256, and ProPhoto's

as a pure 1.8 with none of the linear segment below 16/512 — so the byte

computed here is not the color it paints, however far from a boundary.
