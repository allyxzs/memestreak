import { test, expect } from "@playwright/test";
test("create, complete, skip, persist, favorite and correct in calendar", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Novo hábito", exact: true }).click();
  await page.getByLabel("Nome do hábito").fill("Ler 10 minutos");
  await page
    .getByRole("button", { name: "Criar meu hábito", exact: true })
    .click();
  await page.getByRole("button", { name: "Fiz hoje", exact: true }).click();
  await expect(page.getByText("Você apareceu. Isso conta!")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Você apareceu. Isso conta!")).toBeVisible();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await page.getByRole("button", { name: "Pulei", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Guardar meme", exact: true }).click();
  await page.getByRole("button", { name: "Bora seguir", exact: false }).click();
  await page
    .getByRole("button", { name: "Galeria de memes", exact: true })
    .click();
  await page.getByRole("button", { name: "Favoritos", exact: true }).click();
  await expect(page.locator(".meme-tile")).toHaveCount(1);
  await page.getByRole("button", { name: "Calendário", exact: true }).click();
  await page.locator(".calendar-day.today").click();
  await page
    .getByRole("button", { name: "Fiz nesse dia", exact: true })
    .click();
  await expect(page.locator(".calendar-day.today")).toHaveClass(/done/);
  await page
    .getByRole("button", { name: "Meu progresso", exact: true })
    .click();
  await expect(page.getByText("100%", { exact: true })).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("custom meme can be created, voted, favorited and deleted", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Galeria de memes", exact: true })
    .click();
  await page.getByRole("button", { name: "Criar meme", exact: true }).click();
  await page.getByLabel("Texto de cima").fill("MEU PLANO");
  await page.getByLabel("Texto de baixo").fill("Recomeçar de novo");
  await page
    .getByRole("button", { name: "Adicionar à coleção", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Votar em MEU PLANO", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Votar em MEU PLANO", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Excluir MEU PLANO", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.getByText("MEU PLANO", { exact: true })).toHaveCount(0);
});
