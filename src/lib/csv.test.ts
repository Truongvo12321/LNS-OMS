// Chạy: node src/lib/csv.test.ts  (Node ≥ 23 tự bỏ type TypeScript)
import assert from "node:assert/strict";
import { normHeader, parseCsv } from "./csv.ts";

assert.deepEqual(parseCsv("a,b\n1,2\n"), [["a", "b"], ["1", "2"]]);
// Địa chỉ Walmart có dấu phẩy trong ngoặc kép, CRLF, BOM, dòng trống
assert.deepEqual(
  parseCsv('﻿PO#,Customer Shipping Address,Qty\r\n129027016008027,"12002 Fairpoint Dr, Houston, TX 77099",1\r\n\r\n'),
  [["PO#", "Customer Shipping Address", "Qty"], ["129027016008027", "12002 Fairpoint Dr, Houston, TX 77099", "1"]],
);
assert.deepEqual(parseCsv('x,"say ""hi""",y'), [["x", 'say "hi"', "y"]]); // "" thoát dấu ngoặc
assert.deepEqual(parseCsv('a,"line1\nline2"'), [["a", "line1\nline2"]]); // xuống dòng trong ô
assert.equal(normHeader("Order #"), "order");
assert.equal(normHeader("PO#"), "po");
assert.equal(normHeader("Ship By"), "shipby");
console.log("csv: all checks passed");
