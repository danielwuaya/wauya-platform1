import test from "node:test";
import assert from "node:assert/strict";
import { recoverSpreadsheetErrors } from "../api/sheets.js";

test("recovers phone numbers entered as formulas without replacing unrelated errors", () => {
  assert.deepEqual(
    recoverSpreadsheetErrors(
      [["Empresa", "Teléfono", "Nota"], ["Taller", "#NAME?", "#REF!"]],
      [["Empresa", "Teléfono", "Nota"], ["Taller", "=+1 905-688-4760", "=A99"]],
    ),
    [["Empresa", "Teléfono", "Nota"], ["Taller", "+1 905-688-4760", "#REF!"]],
  );
});
