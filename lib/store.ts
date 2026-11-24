import { z } from "zod";
import { dateKey, parseDate, scheduled, type Habit } from "./engine";
export const KEY = "memestreak:v1";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      v >= "2000-01-01" && v <= "2100-12-31" && dateKey(parseDate(v)) === v,
    "Data inválida",
  );
const habit = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(60),
  emoji: z.string().min(1).max(16),
  days: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .refine((v) => new Set(v).size === v.length),
  goal: z.number().int().min(1).max(365),
  created: date,
  archived: z.boolean(),
  pauses: z
    .array(z.object({ start: date, end: date.nullable() }))
    .max(1000)
    .optional(),
  logs: z.record(date, z.enum(["done", "skipped"])),
});
export const categories = [
  "Procrastinação",
  "Recomeço",
  "Expectativa × realidade",
] as const;
export const memeSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().trim().min(1).max(90),
  bottom: z.string().trim().min(1).max(120),
  emoji: z.string().min(1).max(16),
  category: z.enum(categories),
  tone: z.enum(["pink", "yellow", "green", "blue"]),
  image: z
    .string()
    .max(500000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});
export type Meme = z.infer<typeof memeSchema>;
export const stateSchema = z
  .object({
    version: z.literal(1),
    habits: z.array(habit).max(100),
    memes: z.array(memeSchema).max(100),
    favorites: z.array(z.string()).max(200),
    votes: z.array(z.string()).max(200),
    seen: z.array(z.string()).max(20000),
    gentle: z.boolean(),
  })
  .superRefine((s, ctx) => {
    for (const list of [s.habits, s.memes])
      if (new Set(list.map((x) => x.id)).size !== list.length)
        ctx.addIssue({ code: "custom", message: "IDs duplicados" });
    for (const h of s.habits)
      for (const p of h.pauses || [])
        if (p.end && p.end < p.start)
          ctx.addIssue({ code: "custom", message: "Pausa inválida" });
    for (const h of s.habits)
      for (const d of Object.keys(h.logs))
        if (!scheduled(h, d))
          ctx.addIssue({ code: "custom", message: "Registro fora da rotina" });
  });
export type State = z.infer<typeof stateSchema>;
export const initialState = (): State => ({
  version: 1,
  habits: [],
  memes: [],
  favorites: [],
  votes: [],
  seen: [],
  gentle: true,
});
export const catalog: Meme[] = [
  {
    id: "m1",
    title: "EU: HOJE VOU SER PRODUTIVO",
    bottom: "Também eu, 3 horas depois: só mais um vídeo.",
    emoji: "🦥",
    category: "Procrastinação",
    tone: "pink",
  },
  {
    id: "m2",
    title: "MEU PLANO ERA INFALÍVEL",
    bottom: "O problema foi incluir eu no plano.",
    emoji: "🫠",
    category: "Expectativa × realidade",
    tone: "yellow",
  },
  {
    id: "m3",
    title: "VOLTANDO PARA O HÁBITO",
    bottom: "Como se eu não tivesse sumido por um arco inteiro.",
    emoji: "🐸",
    category: "Recomeço",
    tone: "green",
  },
  {
    id: "m4",
    title: "A MOTIVAÇÃO SAIU DO GRUPO",
    bottom: "Mas eu ainda sou administrador.",
    emoji: "🐈",
    category: "Recomeço",
    tone: "blue",
  },
  {
    id: "m5",
    title: "EU NEGOCIANDO COMIGO",
    bottom: "Cinco minutinhos. Pela décima segunda vez.",
    emoji: "🛌",
    category: "Procrastinação",
    tone: "yellow",
  },
  {
    id: "m6",
    title: "ATUALIZAÇÃO DO SISTEMA",
    bottom: "Disciplina não encontrada. Tentando novamente…",
    emoji: "🤖",
    category: "Recomeço",
    tone: "pink",
  },
  {
    id: "m7",
    title: "EU COMPRANDO UM CADERNO NOVO",
    bottom: "Agora minha vida se organiza sozinha, né?",
    emoji: "📓",
    category: "Expectativa × realidade",
    tone: "blue",
  },
  {
    id: "m8",
    title: "NÃO FOI DESSA VEZ",
    bottom: "Mas meu comeback já está em pré-produção.",
    emoji: "🎬",
    category: "Recomeço",
    tone: "green",
  },
];
export function decode(text: string): State {
  if (text.length > 4_000_000)
    throw new Error("Backup muito grande (máximo 4 MB).");
  return stateSchema.parse(JSON.parse(text));
}
export function save(state: State): void {
  const text = JSON.stringify(state);
  if (text.length > 4_000_000)
    throw new Error("Espaço cheio. Exporte um backup e remova alguns memes.");
  localStorage.setItem(KEY, text);
}
export function newHabit(
  name: string,
  emoji: string,
  days: number[],
  goal: number,
  today: string,
): Habit {
  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    emoji,
    days,
    goal,
    created: today,
    archived: false,
    logs: {},
  };
}
