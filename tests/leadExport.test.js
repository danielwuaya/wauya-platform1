import test from "node:test";
import assert from "node:assert/strict";
import { buildLeadsExcelXml } from "../src/leadExport.js";

test("genera una hoja de Excel con todos los leads y el vendedor", () => {
  const xml = buildLeadsExcelXml([
    { id: "1", company: "Taller & Motor", priority: "A", email: "ventas@taller.ca", assigned_seller: "7" },
    { id: "2", company: "Clínica Norte", priority: "B", do_not_contact: true },
  ], [{ id: 7, name: "Ana Gómez" }]);

  assert.match(xml, /Excel\.Sheet/);
  assert.match(xml, /Taller &amp; Motor/);
  assert.match(xml, /Clínica Norte/);
  assert.match(xml, /Ana Gómez/);
  assert.match(xml, /<Data ss:Type="String">Sí<\/Data>/);
  assert.equal((xml.match(/<Row>/g) || []).length, 3);
});

test("escapa contenido para producir XML válido", () => {
  const xml = buildLeadsExcelXml([{ company: '<script>alert("x")</script>' }]);
  assert.doesNotMatch(xml, /<script>/);
  assert.match(xml, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
});

