import { JSDOM } from "jsdom";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { dateKey, shift } from "../lib/engine";
import { initialState, KEY } from "../lib/store";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:3000",
  pretendToBeVisual: true,
});
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "NodeFilter",
  "Event",
  "CustomEvent",
  "MutationObserver",
  "HTMLInputElement",
  "HTMLButtonElement",
  "HTMLSelectElement",
  "DocumentFragment",
  "localStorage",
  "getComputedStyle",
])
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: (dom.window as unknown as Record<string, unknown>)[name],
  });
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
  value: true,
  writable: true,
});
const { render, screen, fireEvent, cleanup, waitFor } =
  await import("@testing-library/react");
const { App } = await import("../components/app");
afterEach(() => {
  cleanup();
  localStorage.clear();
});
async function click(name: string) {
  fireEvent.click(await screen.findByRole("button", { name }));
}
async function create() {
  await click("Novo hábito");
  fireEvent.change(screen.getByLabelText("Nome do hábito"), {
    target: { value: "Ler 10 minutos" },
  });
  await click("Criar meu hábito");
}
test("habit can be created, completed and recovered after remount", async () => {
  render(<App />);
  await create();
  await click("Fiz hoje");
  assert.ok(screen.getByText("✓ Você apareceu. Isso conta!"));
  const saved = JSON.parse(localStorage.getItem(KEY)!);
  assert.equal(saved.habits[0].logs[dateKey()], "done");
  cleanup();
  render(<App />);
  assert.ok(await screen.findByText("✓ Você apareceu. Isso conta!"));
});
test("skip offers a meme, allows favorite and undo", async () => {
  render(<App />);
  await create();
  await click("Pulei");
  assert.ok(await screen.findByRole("dialog"));
  await click("Guardar meme");
  await click("Bora seguir 🌱");
  await click("Desfazer");
  assert.ok(await screen.findByRole("button", { name: "Fiz hoje" }));
  assert.equal(JSON.parse(localStorage.getItem(KEY)!).favorites.length, 1);
});
test("return after missed day detects a break once", async () => {
  const today = dateKey(),
    start = shift(today, -3);
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...initialState(),
      habits: [
        {
          id: "return",
          name: "Voltar",
          emoji: "🌱",
          created: start,
          days: [0, 1, 2, 3, 4, 5, 6],
          goal: 7,
          archived: false,
          logs: { [start]: "done" },
        },
      ],
    }),
  );
  render(<App />);
  assert.ok(await screen.findByRole("dialog"));
  await click("Bora seguir 🌱");
  cleanup();
  render(<App />);
  await screen.findByRole("heading", { name: "Bora aparecer por você?" });
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(JSON.parse(localStorage.getItem(KEY)!).seen.length, 1);
});
test("gentle mode hides missed totals and can be switched off", async () => {
  const today = dateKey();
  localStorage.setItem(
    KEY,
    JSON.stringify({
      ...initialState(),
      habits: [
        {
          id: "gentle",
          name: "Respirar",
          emoji: "🌱",
          created: shift(today, -1),
          days: [0, 1, 2, 3, 4, 5, 6],
          goal: 7,
          archived: false,
          logs: {},
        },
      ],
    }),
  );
  render(<App />);
  await click("Meu progresso");
  assert.equal(screen.queryByText(/dias não cumpridos/), null);
  fireEvent.click(screen.getByRole("switch", { name: /Sem julgamento/ }));
  assert.ok(screen.getByText(/1 dias não cumpridos/));
});
test("invalid saved data is preserved instead of overwritten", async () => {
  localStorage.setItem(KEY, "{broken");
  render(<App />);
  assert.ok(await screen.findByText(/Seus dados originais foram preservados/));
  await create();
  assert.equal(localStorage.getItem(KEY), "{broken");
});
test("custom meme supports voting, favorites and removal", async () => {
  render(<App />);
  await click("Galeria de memes");
  await click("Criar meme");
  fireEvent.change(screen.getByLabelText("Texto de cima"), {
    target: { value: "MEU PLANO" },
  });
  fireEvent.change(screen.getByLabelText("Texto de baixo"), {
    target: { value: "Recomeçar de novo" },
  });
  await click("Adicionar à coleção");
  await click("Votar em MEU PLANO");
  assert.equal(
    screen
      .getByRole("button", { name: "Votar em MEU PLANO" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await click("Favoritar MEU PLANO");
  await click("Favoritos");
  assert.ok(screen.getByText("MEU PLANO"));
  await click("Excluir MEU PLANO");
  await click("Confirmar");
  await waitFor(() => assert.equal(screen.queryByText("MEU PLANO"), null));
});

test("backup restore validates data and requires confirmation before replacement", async () => {
  render(<App />);
  await create();
  await click("Preferências");
  const backup = {
    ...initialState(),
    habits: [
      {
        id: "imported",
        name: "Caminhar",
        emoji: "🌱",
        created: dateKey(),
        days: [0, 1, 2, 3, 4, 5, 6],
        goal: 14,
        archived: false,
        logs: {},
      },
    ],
  };
  const file = { size: 1024, text: async () => JSON.stringify(backup) };
  fireEvent.change(document.querySelector('input[type="file"]')!, {
    target: { files: [file] },
  });
  await screen.findByRole("dialog");
  assert.equal(
    JSON.parse(localStorage.getItem(KEY)!).habits[0].name,
    "Ler 10 minutos",
  );
  await click("Confirmar");
  assert.equal(
    JSON.parse(localStorage.getItem(KEY)!).habits[0].name,
    "Caminhar",
  );
});

test("a failed storage write never reports a completion as saved", async () => {
  render(<App />);
  await create();
  const original = dom.window.Storage.prototype.setItem;
  dom.window.Storage.prototype.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  try {
    await click("Fiz hoje");
    assert.ok(screen.getByText(/Não foi possível salvar/));
    assert.ok(screen.getByRole("button", { name: "Fiz hoje" }));
    assert.deepEqual(JSON.parse(localStorage.getItem(KEY)!).habits[0].logs, {});
  } finally {
    dom.window.Storage.prototype.setItem = original;
  }
});
