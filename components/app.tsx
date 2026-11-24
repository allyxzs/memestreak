"use client";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  Home,
  ImagePlus,
  Laugh,
  Pencil,
  Plus,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Modal } from "./ui/dialog";
import {
  archiveHabit,
  breaks,
  dateKey,
  datesBetween,
  parseDate,
  scheduled,
  setLog,
  shift,
  stats,
  type Habit,
  type Status,
} from "@/lib/engine";
import {
  catalog,
  categories,
  decode,
  initialState,
  KEY,
  newHabit,
  save,
  type Meme,
  type State,
} from "@/lib/store";

type Tab = "today" | "calendar" | "memes" | "stats" | "settings";
const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const icons = ["💧", "📚", "🏃", "🧘", "💪", "🌱", "💻", "🎨", "😴", "🥗"];
const nav = [
  { id: "today" as Tab, label: "Meu dia", icon: Home },
  { id: "calendar" as Tab, label: "Calendário", icon: CalendarDays },
  { id: "memes" as Tab, label: "Galeria de memes", icon: Laugh },
  { id: "stats" as Tab, label: "Meu progresso", icon: BarChart3 },
];
function MemeCard({
  meme,
  compact = false,
}: {
  meme: Meme;
  compact?: boolean;
}) {
  return (
    <div className={`meme-art ${meme.tone} ${compact ? "compact" : ""}`}>
      <p>{meme.title}</p>
      {meme.image ? (
        <img src={meme.image} alt={meme.title} className="custom-meme" />
      ) : (
        <span className="meme-emoji" aria-hidden="true">
          {meme.emoji}
        </span>
      )}
      <p>{meme.bottom}</p>
    </div>
  );
}

export function App() {
  const [state, setState] = useState<State>(initialState),
    [ready, setReady] = useState(false),
    [today, setToday] = useState(""),
    [tab, setTab] = useState<Tab>("today");
  const [notice, setNotice] = useState(""),
    [blocked, setBlocked] = useState(false),
    [editor, setEditor] = useState<Habit | "new" | null>(null),
    [selected, setSelected] = useState(""),
    [month, setMonth] = useState(""),
    [dayEditor, setDayEditor] = useState<string | null>(null),
    [memeEditor, setMemeEditor] = useState(false),
    [reaction, setReaction] = useState<Meme | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      description: string;
      action: () => void;
    } | null>(null),
    [filter, setFilter] = useState("Todos"),
    [sort, setSort] = useState("recent"),
    [showArchived, setShowArchived] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    stateRef = useRef(state),
    blockedRef = useRef(false);
  function update(next: State) {
    if (blockedRef.current) {
      setNotice(
        "Os dados salvos precisam ser recuperados nas Preferências antes de continuar.",
      );
      return false;
    }
    try {
      save(next);
      stateRef.current = next;
      setState(next);
      return true;
    } catch {
      setNotice(
        "Não foi possível salvar. Verifique o armazenamento do navegador ou exporte um backup.",
      );
      return false;
    }
  }
  useEffect(() => {
    const now = dateKey();
    setToday(now);
    setMonth(now.slice(0, 7));
    try {
      const raw = localStorage.getItem(KEY);
      const loaded = raw ? decode(raw) : initialState();
      stateRef.current = loaded;
      setState(loaded);
    } catch {
      blockedRef.current = true;
      setBlocked(true);
      setNotice(
        "Não foi possível ler os dados. Abra Preferências para exportar o arquivo original ou restaurar um backup.",
      );
    }
    setReady(true);
    const refresh = () => setToday(dateKey());
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    const sync = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        const next = e.newValue ? decode(e.newValue) : initialState();
        stateRef.current = next;
        setState(next);
        blockedRef.current = false;
        setBlocked(false);
      } catch {
        blockedRef.current = true;
        setBlocked(true);
        setNotice("Dados alterados em outra aba não puderam ser lidos.");
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (!ready || !today || blocked) return;
    const pending = state.habits
      .filter((h) => !h.archived)
      .flatMap((h) => breaks(h, today))
      .filter((k) => !state.seen.includes(k));
    if (pending.length) {
      const all = [...catalog, ...state.memes];
      const picked = all[Math.floor(Math.random() * all.length)];
      if (update({ ...state, seen: [...state.seen, ...pending].slice(-20000) }))
        setReaction(picked);
    }
    // Changes to habit history or the local date trigger break detection, including a return after days away.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, today, state.habits, blocked]);
  const allMemes = [...catalog, ...state.memes];
  const active = state.habits.filter((h) => !h.archived),
    due = active.filter((h) => scheduled(h, today)),
    done = due.filter((h) => h.logs[today] === "done").length;
  const aggregate = state.habits.map((h) => stats(h, today));
  const total = aggregate.reduce((a, s) => a + s.total, 0),
    opportunities = aggregate.reduce((a, s) => a + s.opportunities, 0),
    best = Math.max(0, ...aggregate.map((s) => s.best));
  const currentHabit =
    state.habits.find((h) => h.id === selected) || active[0] || state.habits[0];
  const dailyMeme =
    catalog[
      today
        ? Math.floor(parseDate(today).getTime() / 86400000) % catalog.length
        : 0
    ];
  function mark(h: Habit, day: string, status: Status | undefined) {
    const current = stateRef.current;
    try {
      const next = setLog(h, day, status, today);
      if (
        update({
          ...current,
          habits: current.habits.map((x) => (x.id === h.id ? next : x)),
        })
      ) {
        setDayEditor(null);
        setNotice(
          status === "done"
            ? "Pequena vitória registrada. Você apareceu!"
            : status === "skipped"
              ? "Tudo bem. O próximo passo continua disponível."
              : "Registro desfeito.",
        );
        if (status === "skipped")
          setReaction(allMemes[Math.floor(Math.random() * allMemes.length)]);
      }
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function toggle(field: "favorites" | "votes", id: string) {
    const s = stateRef.current;
    update({
      ...s,
      [field]: s[field].includes(id)
        ? s[field].filter((x) => x !== id)
        : [...s[field], id],
    });
  }
  function download(text: string, name: string) {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error("Máximo de 4 MB.");
      const imported = decode(await file.text());
      if (
        imported.habits.some(
          (h) =>
            h.created > today || Object.keys(h.logs).some((d) => d > today),
        )
      )
        throw new Error("O backup contém datas futuras.");
      setConfirm({
        title: "Restaurar este backup?",
        description: `Os dados atuais serão substituídos por ${imported.habits.length} hábito(s) e ${imported.memes.length} meme(s) pessoais. Exporte os dados atuais antes, se quiser preservá-los.`,
        action: () => {
          try {
            save(imported);
            blockedRef.current = false;
            setBlocked(false);
            stateRef.current = imported;
            setState(imported);
            setNotice("Backup restaurado.");
          } catch {
            setNotice("Não foi possível salvar o backup neste navegador.");
          }
        },
      });
    } catch {
      setNotice(
        "Backup inválido. Use um JSON exportado pelo MemeStreak, de até 4 MB e sem datas futuras.",
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  if (!ready)
    return (
      <div className="loading">
        <Flame size={40} />
        <p>Preparando seus pequenos grandes passos…</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("today");
          }}
        >
          <img src="/icon.svg" alt="" />
          MemeStreak<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">SEU CANTINHO DE CONSTÂNCIA</div>
        <nav aria-label="Navegação principal">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`nav-item ${tab === n.id ? "active" : ""}`}
              aria-current={tab === n.id ? "page" : undefined}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
              {n.id === "today" && (
                <span className="nav-count">{due.length - done}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="gentle-note">
            <span>🌱</span>
            <strong>Um dia de cada vez.</strong>
            <p>
              Você não precisa ser perfeito.
              <br />
              Só precisa poder recomeçar.
            </p>
          </div>
          <button
            className={`nav-item ${tab === "settings" ? "active" : ""}`}
            onClick={() => setTab("settings")}
          >
            <Settings size={20} />
            Preferências
          </button>
          <div className="local-label">
            <span />
            Salvo neste navegador
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Seu espaço <span>/</span>{" "}
            <strong>
              {tab === "settings"
                ? "Preferências"
                : nav.find((n) => n.id === tab)?.label}
            </strong>
          </span>
          <button
            className={`gentle-toggle ${state.gentle ? "on" : ""}`}
            role="switch"
            aria-checked={state.gentle}
            onClick={() => update({ ...state, gentle: !state.gentle })}
          >
            <ShieldCheck size={17} />
            <span>Sem julgamento</span>
            <span className="switch-track">
              <span />
            </span>
          </button>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "today"
                  ? new Intl.DateTimeFormat("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).format(parseDate(today))
                  : "MENOS COBRANÇA. MAIS RECOMEÇOS."}
              </div>
              <h1>
                {
                  {
                    today: "Bora aparecer por você?",
                    calendar: "Cada quadradinho, uma história.",
                    memes: "Rir também é autocuidado.",
                    stats: "Olha o quanto você já fez.",
                    settings: "Do seu jeito.",
                  }[tab]
                }
              </h1>
              <p className="muted">
                {
                  {
                    today: "Pequenos passos contam. Até os meio desajeitados.",
                    calendar: "Suas vitórias merecem um lugar no calendário.",
                    memes: "Uma coleção para quando a disciplina tira férias.",
                    stats: "Progresso real, sem competição com ninguém.",
                    settings:
                      "Um espaço mais leve, com seus dados nas suas mãos.",
                  }[tab]
                }
              </p>
            </div>
            {tab === "today" && (
              <Button onClick={() => setEditor("new")}>
                <Plus size={18} />
                Novo hábito
              </Button>
            )}
            {tab === "memes" && (
              <Button onClick={() => setMemeEditor(true)}>
                <ImagePlus size={18} />
                Criar meme
              </Button>
            )}
          </div>
          {notice && (
            <div role="status" className="notice">
              <span>{notice}</span>
              <button
                aria-label="Dispensar aviso"
                onClick={() => setNotice("")}
                className="icon-button"
              >
                <X size={17} />
              </button>
            </div>
          )}
          {blocked && (
            <div className="panel recovery">
              Seus dados originais foram preservados.{" "}
              <Button variant="outline" onClick={() => setTab("settings")}>
                Recuperar dados
              </Button>
            </div>
          )}
          {tab === "today" && (
            <>
              <section className="hero">
                <div>
                  <span className="pill">
                    <Sparkles size={14} />A META É CONTINUAR
                  </span>
                  <h2>
                    Consistência é voltar.
                    <br />
                    <span>Mesmo depois do “ops”.</span>
                  </h2>
                  <p>
                    Se hoje não rolar, tudo bem. Amanhã tem outra chance.
                    <br />E provavelmente um meme muito bom.
                  </p>
                  <div className="hero-footer">
                    <span className="mini-faces">🙂 🫠 😎</span>
                    <span>100% humano. 0% julgamento.</span>
                  </div>
                </div>
                <div className="hero-doodle" aria-hidden="true">
                  <span className="doodle-star star-a">✧</span>
                  <div className="flame-friend">
                    <Flame size={140} strokeWidth={1.2} />
                    <span>•‿•</span>
                  </div>
                  <span className="doodle-star star-b">✦</span>
                  <div className="doodle-tag">tentando & tá tudo bem</div>
                </div>
              </section>
              <div className="stat-grid">
                <div className="stat-card">
                  <span className="stat-icon green">
                    <Check />
                  </span>
                  <div>
                    <span>Feitos hoje</span>
                    <strong>
                      {done}
                      <small> / {due.length}</small>
                    </strong>
                  </div>
                  <span className="stat-detail">no seu ritmo</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon peach">
                    <Flame />
                  </span>
                  <div>
                    <span>Maior sequência</span>
                    <strong>
                      {best}
                      <small> {best === 1 ? "dia" : "dias"}</small>
                    </strong>
                  </div>
                  <span className="stat-detail">seu recorde pessoal</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon lavender">
                    <Sparkles />
                  </span>
                  <div>
                    <span>Pequenas vitórias</span>
                    <strong>{total}</strong>
                  </div>
                  <span className="stat-detail">cada uma conta</span>
                </div>
              </div>
              <div className="dashboard-grid">
                <section>
                  <div className="section-heading">
                    <h2>
                      Seus hábitos <span>{due.length}</span>
                    </h2>
                    <span className="muted small">
                      {done === due.length && due.length
                        ? "Tudo feito. Boa! ✨"
                        : "Um passo de cada vez"}
                    </span>
                  </div>
                  {!due.length && (
                    <div className="empty panel">
                      <span>🌱</span>
                      <h3>
                        {active.length
                          ? "Hoje é dia de respirar."
                          : "Toda sequência começa com um dia."}
                      </h3>
                      <p>
                        {active.length
                          ? "Nenhum hábito programado para hoje. Veja suas rotinas abaixo."
                          : "Escolha algo pequeno. Beber água já é um ótimo começo."}
                      </p>
                      {!active.length && (
                        <Button onClick={() => setEditor("new")}>
                          <Plus size={18} />
                          Criar meu primeiro hábito
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="habit-list">
                    {due.map((h) => {
                      const s = stats(h, today),
                        status = h.logs[today];
                      return (
                        <article
                          className={`habit-card ${status === "done" ? "completed" : ""}`}
                          key={h.id}
                        >
                          <div className="habit-top">
                            <span className="habit-emoji">{h.emoji}</span>
                            <div className="habit-title">
                              <h3>{h.name}</h3>
                              <span className="muted small">
                                {h.days.length === 7
                                  ? "Todos os dias"
                                  : h.days
                                      .map((d) => weekdays[d])
                                      .join(" · ")}{" "}
                                · Meta: {h.goal} dias
                              </span>
                            </div>
                            <button
                              className="icon-button"
                              aria-label={`Editar ${h.name}`}
                              onClick={() => setEditor(h)}
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                          <div className="habit-middle">
                            <span className="streak">
                              <Flame size={18} />
                              {s.current}{" "}
                              <span>
                                {s.current === 1 ? "dia" : "dias"} de sequência
                              </span>
                            </span>
                            <div className="week-dots">
                              {datesBetween(shift(today, -6), today).map(
                                (d) => (
                                  <span
                                    key={d}
                                    className={`week-dot ${h.logs[d] === "done" ? "done" : ""} ${d === today ? "today" : ""}`}
                                    title={`${d}: ${h.logs[d] === "done" ? "feito" : scheduled(h, d) ? "programado" : "folga"}`}
                                  >
                                    {h.logs[d] === "done" ? (
                                      <Check size={11} />
                                    ) : (
                                      weekdays[parseDate(d).getDay()][0]
                                    )}
                                  </span>
                                ),
                              )}
                            </div>
                          </div>
                          <div className="progress-track">
                            <div
                              style={{
                                width: `${Math.min((s.current / h.goal) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="habit-actions">
                            {!status ? (
                              <>
                                <Button onClick={() => mark(h, today, "done")}>
                                  <Check size={18} />
                                  Fiz hoje
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => mark(h, today, "skipped")}
                                >
                                  Pulei
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="status-text">
                                  {status === "done"
                                    ? "✓ Você apareceu. Isso conta!"
                                    : "🌿 Amanhã tem um novo capítulo."}
                                </span>
                                <Button
                                  variant="ghost"
                                  onClick={() => mark(h, today, undefined)}
                                >
                                  <RotateCcw size={14} />
                                  Desfazer
                                </Button>
                              </>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {active.some((h) => !scheduled(h, today)) && (
                    <div className="rest-list">
                      <h3>De folga hoje</h3>
                      {active
                        .filter((h) => !scheduled(h, today))
                        .map((h) => (
                          <button key={h.id} onClick={() => setEditor(h)}>
                            {h.emoji} {h.name}
                            <span>
                              {h.days.map((d) => weekdays[d]).join(" · ")}
                            </span>
                            <Pencil size={14} />
                          </button>
                        ))}
                    </div>
                  )}
                </section>
                <aside className="right-column">
                  <div className="daily-meme panel">
                    <div className="section-heading">
                      <h3>
                        <Laugh size={18} />
                        Meme do dia
                      </h3>
                      <span className="pill tiny">TERAPIA NÃO, MEME SIM</span>
                    </div>
                    <MemeCard meme={dailyMeme} compact />
                    <div className="meme-bottom">
                      <span className="muted small">
                        Para rir e seguir em frente.
                      </span>
                      <button
                        className={`icon-button ${state.favorites.includes(dailyMeme.id) ? "favorited" : ""}`}
                        aria-label="Favoritar meme do dia"
                        aria-pressed={state.favorites.includes(dailyMeme.id)}
                        onClick={() => toggle("favorites", dailyMeme.id)}
                      >
                        <Heart size={18} />
                      </button>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setTab("memes")}
                    >
                      Explorar a galeria <ChevronRight size={15} />
                    </button>
                  </div>
                  <div className="kind-note">
                    <span>✳</span>
                    <h3>
                      Uma pausa não apaga
                      <br />o seu progresso.
                    </h3>
                    <p>
                      Os dias em que você tentou continuam contando. Sempre.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {tab === "calendar" && (
            <section className="panel calendar-panel">
              {!currentHabit ? (
                <Empty onCreate={() => setEditor("new")} />
              ) : (
                <>
                  <div className="calendar-toolbar">
                    <label>
                      Hábito
                      <select
                        value={currentHabit.id}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        {state.habits.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.emoji} {h.name}
                            {h.archived ? " (arquivado)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="month-control">
                      <button
                        className="icon-button"
                        aria-label="Mês anterior"
                        onClick={() => {
                          const d = parseDate(`${month}-01`);
                          d.setMonth(d.getMonth() - 1);
                          setMonth(dateKey(d).slice(0, 7));
                        }}
                      >
                        <ChevronLeft />
                      </button>
                      <strong>
                        {new Intl.DateTimeFormat("pt-BR", {
                          month: "long",
                          year: "numeric",
                        }).format(parseDate(`${month}-01`))}
                      </strong>
                      <button
                        className="icon-button"
                        aria-label="Próximo mês"
                        onClick={() => {
                          const d = parseDate(`${month}-01`);
                          d.setMonth(d.getMonth() + 1);
                          setMonth(dateKey(d).slice(0, 7));
                        }}
                      >
                        <ChevronRight />
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setMonth(today.slice(0, 7))}
                    >
                      Hoje
                    </Button>
                  </div>
                  <div className="calendar-grid">
                    {weekdays.map((d) => (
                      <span className="weekday" key={d}>
                        {d}
                      </span>
                    ))}
                    {Array.from(
                      { length: parseDate(`${month}-01`).getDay() },
                      (_, i) => (
                        <span key={`blank${i}`} />
                      ),
                    )}
                    {Array.from(
                      {
                        length: new Date(
                          Number(month.slice(0, 4)),
                          Number(month.slice(5)),
                          0,
                        ).getDate(),
                      },
                      (_, i) => {
                        const day = `${month}-${String(i + 1).padStart(2, "0")}`,
                          status = currentHabit.logs[day],
                          valid = scheduled(currentHabit, day) && day <= today;
                        return (
                          <button
                            key={day}
                            disabled={!valid || currentHabit.archived}
                            onClick={() => setDayEditor(day)}
                            className={`calendar-day ${status === "done" ? "done" : status === "skipped" ? "paused" : ""} ${day === today ? "today" : ""}`}
                            aria-label={`${day}: ${status === "done" ? "feito" : status === "skipped" ? "pausa" : valid ? "sem registro" : "sem atividade"}`}
                          >
                            <span>{i + 1}</span>
                            {status === "done" ? (
                              <Check size={20} />
                            ) : status === "skipped" ? (
                              <span>🌿</span>
                            ) : valid ? (
                              <span className="day-dot" />
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                  <div className="calendar-legend">
                    <span>🟢 Feito</span>
                    <span>🌿 Pausa</span>
                    <span>○ Sem registro</span>
                  </div>
                  <p className="muted small">
                    Toque em um dia programado para registrar ou corrigir.{" "}
                    {currentHabit.archived
                      ? "Desarquive este hábito nas Preferências para alterar registros."
                      : "Dias futuros e folgas ficam desativados."}
                  </p>
                </>
              )}
            </section>
          )}
          {tab === "memes" && (
            <>
              <div className="filter-bar">
                <div className="tabs">
                  {["Todos", "Favoritos", ...categories].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Ordenar memes"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="votes">Meus mais engraçados</option>
                </select>
              </div>
              <p className="muted small">
                Favoritos e votos são pessoais, salvos neste navegador.
              </p>
              <div className="meme-grid">
                {[...allMemes]
                  .reverse()
                  .filter(
                    (m) =>
                      filter === "Todos" ||
                      (filter === "Favoritos" &&
                        state.favorites.includes(m.id)) ||
                      filter === m.category,
                  )
                  .sort((a, b) =>
                    sort === "votes"
                      ? Number(state.votes.includes(b.id)) -
                        Number(state.votes.includes(a.id))
                      : 0,
                  )
                  .map((m) => (
                    <article className="meme-tile panel" key={m.id}>
                      <MemeCard meme={m} />
                      <div className="meme-tile-footer">
                        <span>{m.category}</span>
                        <div>
                          <button
                            className={`icon-button ${state.votes.includes(m.id) ? "voted" : ""}`}
                            aria-label={`Votar em ${m.title}`}
                            aria-pressed={state.votes.includes(m.id)}
                            onClick={() => toggle("votes", m.id)}
                          >
                            <ThumbsUp size={18} />
                            <small>{state.votes.includes(m.id) ? 1 : 0}</small>
                          </button>
                          <button
                            className={`icon-button ${state.favorites.includes(m.id) ? "favorited" : ""}`}
                            aria-label={`Favoritar ${m.title}`}
                            aria-pressed={state.favorites.includes(m.id)}
                            onClick={() => toggle("favorites", m.id)}
                          >
                            <Heart size={18} />
                          </button>
                          {state.memes.some((x) => x.id === m.id) && (
                            <button
                              className="icon-button"
                              aria-label={`Excluir ${m.title}`}
                              onClick={() =>
                                setConfirm({
                                  title: "Excluir este meme?",
                                  description:
                                    "Ele será removido da sua galeria e dos favoritos.",
                                  action: () => {
                                    const s = stateRef.current;
                                    update({
                                      ...s,
                                      memes: s.memes.filter(
                                        (x) => x.id !== m.id,
                                      ),
                                      favorites: s.favorites.filter(
                                        (x) => x !== m.id,
                                      ),
                                      votes: s.votes.filter((x) => x !== m.id),
                                    });
                                  },
                                })
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {filter === "Favoritos" &&
                !allMemes.some((m) => state.favorites.includes(m.id)) && (
                  <div className="empty panel">
                    <Heart size={32} />
                    <h3>Sua coleção começa com um coração.</h3>
                    <p>Favorite um meme para encontrá-lo aqui.</p>
                  </div>
                )}
            </>
          )}
          {tab === "stats" && (
            <>
              <div className="stat-grid">
                <Metric
                  title="Dias cumpridos por hábito"
                  value={String(total)}
                  icon="✓"
                />
                <Metric
                  title="Maior sequência"
                  value={`${best} dias`}
                  icon="🔥"
                />
                <Metric
                  title="Consistência geral"
                  value={`${opportunities ? Math.round((total / opportunities) * 100) : 0}%`}
                  icon="🌱"
                />
              </div>
              <div className="panel stats-panel">
                <h2>Cada hábito tem seu ritmo.</h2>
                <p className="muted">
                  A consistência considera os dias programados encerrados e os
                  registros de hoje. Folgas não entram na conta.
                </p>
                {!state.habits.length ? (
                  <Empty onCreate={() => setEditor("new")} />
                ) : (
                  state.habits.map((h) => {
                    const s = stats(h, today);
                    return (
                      <div className="stat-row" key={h.id}>
                        <div>
                          <strong>
                            {h.emoji} {h.name}
                          </strong>
                          <p className="muted small">
                            {h.archived ? "Arquivado · " : ""}
                            {s.total} vitórias · recorde de {s.best} dias
                            {!state.gentle
                              ? ` · ${s.skipped} dias não cumpridos`
                              : ""}
                          </p>
                        </div>
                        <div className="consistency">
                          <div className="progress-track">
                            <div style={{ width: `${s.consistency}%` }} />
                          </div>
                          <strong>{s.consistency}%</strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="kind-note wide">
                <h3>Seu recorde não é a sua identidade.</h3>
                <p>
                  Os números ajudam a enxergar o caminho. Você pode recomeçar
                  quantas vezes precisar.
                </p>
              </div>
            </>
          )}
          {tab === "settings" && (
            <div className="settings-stack">
              <section className="panel settings-panel">
                <h2>
                  <ShieldCheck />
                  Um pouco mais de gentileza
                </h2>
                <div className="setting-row">
                  <div>
                    <strong>Modo sem julgamento</strong>
                    <p className="muted">
                      Esconde a contagem de dias não cumpridos. Memes e palavras
                      de incentivo continuam aparecendo.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => update({ ...state, gentle: !state.gentle })}
                  >
                    {state.gentle ? "Ativado" : "Desativado"}
                  </Button>
                </div>
              </section>
              <section className="panel settings-panel">
                <h2>Seus dados, com você</h2>
                <p className="muted">
                  Esta versão funciona sem conta. Hábitos, memes e votos ficam
                  apenas neste navegador. Limpar os dados do site os remove;
                  exporte um backup para preservá-los.
                </p>
                <div className="button-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        download(
                          blocked
                            ? localStorage.getItem(KEY) || "{}"
                            : JSON.stringify(state, null, 2),
                          `memestreak-backup-${today}.json`,
                        );
                      } catch {
                        setNotice(
                          "Não foi possível acessar os dados originais.",
                        );
                      }
                    }}
                  >
                    <ArrowDownToLine size={18} />
                    Exportar backup{blocked ? " original" : ""}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ArrowUpFromLine size={18} />
                    Restaurar backup
                  </Button>
                  <input
                    type="file"
                    accept="application/json,.json"
                    hidden
                    ref={fileRef}
                    onChange={(e) => void importBackup(e.target.files?.[0])}
                  />
                </div>
              </section>
              <section className="panel settings-panel">
                <div className="section-heading">
                  <h2>Gerenciar hábitos</h2>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    Mostrar arquivados
                  </label>
                </div>
                {state.habits
                  .filter((h) => showArchived || !h.archived)
                  .map((h) => (
                    <div className="manage-row" key={h.id}>
                      <strong>
                        {h.emoji} {h.name}{" "}
                        {h.archived && <small>(arquivado)</small>}
                      </strong>
                      <div className="button-row">
                        <button
                          className="icon-button"
                          aria-label={`Editar ${h.name}`}
                          onClick={() => setEditor(h)}
                        >
                          <Pencil size={17} />
                        </button>
                        <Button
                          variant="ghost"
                          onClick={() =>
                            update({
                              ...state,
                              habits: state.habits.map((x) =>
                                x.id === h.id ? archiveHabit(x, today) : x,
                              ),
                            })
                          }
                        >
                          <Archive size={16} />
                          {h.archived ? "Desarquivar" : "Arquivar"}
                        </Button>
                        <button
                          className="icon-button danger"
                          aria-label={`Excluir ${h.name}`}
                          onClick={() =>
                            setConfirm({
                              title: "Excluir este hábito?",
                              description: `“${h.name}” e seu histórico serão apagados deste navegador. Esta ação não pode ser desfeita.`,
                              action: () => {
                                const s = stateRef.current;
                                update({
                                  ...s,
                                  habits: s.habits.filter((x) => x.id !== h.id),
                                });
                              },
                            })
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}
                {!state.habits.length && (
                  <p className="muted">Seus hábitos aparecerão aqui.</p>
                )}
              </section>
              <div className="about">
                <img src="/icon.svg" alt="" />
                <div>
                  <strong>MemeStreak 1.1.0</strong>
                  <p>Hábitos reais. Memes sinceros. Um recomeço de cada vez.</p>
                </div>
              </div>
            </div>
          )}
          <footer className="page-footer">
            <span>Feito para gente de verdade.</span>
            <span>Um recomeço de cada vez. ✳</span>
          </footer>
        </main>
      </div>
      {editor && (
        <HabitEditor
          habit={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSave={(name, emoji, days, goal) => {
            const s = stateRef.current;
            if (editor === "new" && s.habits.length >= 100) {
              setNotice(
                "Limite de 100 hábitos. Exclua rotinas antigas após exportar um backup.",
              );
              return;
            }
            const h =
              editor === "new"
                ? newHabit(name, emoji, days, goal, today)
                : { ...editor, name, emoji, days, goal };
            if (
              update({
                ...s,
                habits:
                  editor === "new"
                    ? [...s.habits, h]
                    : s.habits.map((x) => (x.id === h.id ? h : x)),
              })
            ) {
              setEditor(null);
              setNotice("Hábito salvo. Seu próximo passo já tem lugar.");
            }
          }}
        />
      )}
      <Modal
        open={!!dayEditor}
        onClose={() => setDayEditor(null)}
        title="Como foi esse dia?"
        description={
          dayEditor
            ? `${currentHabit?.name} · ${parseDate(dayEditor).toLocaleDateString("pt-BR")}`
            : ""
        }
      >
        <div className="button-row vertical">
          <Button
            onClick={() =>
              currentHabit && dayEditor && mark(currentHabit, dayEditor, "done")
            }
          >
            <Check />
            Fiz nesse dia
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              currentHabit &&
              dayEditor &&
              mark(currentHabit, dayEditor, "skipped")
            }
          >
            Pulei nesse dia
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              currentHabit &&
              dayEditor &&
              mark(currentHabit, dayEditor, undefined)
            }
          >
            Remover registro
          </Button>
        </div>
      </Modal>
      {memeEditor && (
        <MemeEditor
          onClose={() => setMemeEditor(false)}
          onSave={(m) => {
            if (state.memes.length >= 100) {
              setNotice("Limite de 100 memes pessoais.");
              return;
            }
            if (update({ ...state, memes: [...state.memes, m] })) {
              setMemeEditor(false);
              setNotice("Seu meme entrou para a coleção.");
            }
          }}
        />
      )}
      <Modal
        open={!!reaction}
        onClose={() => setReaction(null)}
        title="Um tropeço. Um meme. Um recomeço."
        description="A sequência pode mudar. O que você já conquistou continua com você."
      >
        {reaction && (
          <>
            <MemeCard meme={reaction} />
            <div className="reaction-footer">
              <Button
                variant="outline"
                aria-pressed={state.favorites.includes(reaction.id)}
                onClick={() => toggle("favorites", reaction.id)}
              >
                <Heart size={17} />
                {state.favorites.includes(reaction.id)
                  ? "Favoritado"
                  : "Guardar meme"}
              </Button>
              <Button onClick={() => setReaction(null)}>Bora seguir 🌱</Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title || ""}
        description={confirm?.description || ""}
      >
        <div className="button-row">
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              confirm?.action();
              setConfirm(null);
            }}
          >
            Confirmar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty">
      <span>🌱</span>
      <h3>O primeiro passo pode ser pequeno.</h3>
      <p>Crie um hábito para começar a acompanhar seu progresso.</p>
      <Button onClick={onCreate}>
        <Plus size={18} />
        Criar hábito
      </Button>
    </div>
  );
}
function Metric({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="stat-card">
      <span className="stat-icon green">{icon}</span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
function HabitEditor({
  habit,
  onClose,
  onSave,
}: {
  habit?: Habit;
  onClose: () => void;
  onSave: (name: string, emoji: string, days: number[], goal: number) => void;
}) {
  const [name, setName] = useState(habit?.name || ""),
    [emoji, setEmoji] = useState(habit?.emoji || "💧"),
    [days, setDays] = useState(habit?.days || [0, 1, 2, 3, 4, 5, 6]),
    [goal, setGoal] = useState(habit?.goal || 7),
    [error, setError] = useState("");
  const locked = !!habit && Object.keys(habit.logs).length > 0;
  return (
    <Modal
      open
      onClose={onClose}
      title={habit ? "Seu hábito, do seu jeito." : "Um pequeno novo começo."}
      description="Escolha algo possível. Você pode aumentar a meta depois."
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            !name.trim() ||
            !days.length ||
            !Number.isInteger(goal) ||
            goal < 1 ||
            goal > 365
          ) {
            setError(
              "Preencha o nome, ao menos um dia e uma meta entre 1 e 365.",
            );
            return;
          }
          onSave(name.trim(), emoji, [...days].sort(), goal);
        }}
      >
        <label>
          Nome do hábito
          <input
            autoFocus
            maxLength={60}
            placeholder="Ex.: Ler por 10 minutos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <fieldset>
          <legend>Um ícone com a sua cara</legend>
          <div className="emoji-picker">
            {icons.map((i) => (
              <button
                type="button"
                key={i}
                aria-label={`Ícone ${i}`}
                aria-pressed={emoji === i}
                className={emoji === i ? "selected" : ""}
                onClick={() => setEmoji(i)}
              >
                {i}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={locked}>
          <legend>Em quais dias?</legend>
          <div className="day-picker">
            {weekdays.map((d, i) => (
              <button
                type="button"
                key={d}
                aria-pressed={days.includes(i)}
                className={days.includes(i) ? "selected" : ""}
                onClick={() =>
                  setDays(
                    days.includes(i)
                      ? days.filter((x) => x !== i)
                      : [...days, i],
                  )
                }
              >
                {d}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => setDays([0, 1, 2, 3, 4, 5, 6])}
          >
            Todos os dias
          </button>
        </fieldset>
        {locked && (
          <p className="muted small">
            A frequência fica preservada após o primeiro registro para manter o
            histórico correto. Para outra rotina, crie um novo hábito.
          </p>
        )}
        <label>
          Meta de sequência (dias programados)
          <input
            type="number"
            min={1}
            max={365}
            value={goal}
            required
            onChange={(e) => setGoal(Number(e.target.value))}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <Button type="submit">
          {habit ? "Salvar alterações" : "Criar meu hábito"}
          <Plus size={17} />
        </Button>
      </form>
    </Modal>
  );
}
function MemeEditor({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (m: Meme) => void;
}) {
  const [title, setTitle] = useState(""),
    [bottom, setBottom] = useState(""),
    [category, setCategory] = useState<Meme["category"]>("Recomeço"),
    [image, setImage] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 2_000_000
      )
        throw new Error("Use PNG, JPEG ou WebP de até 2 MB.");
      const bitmap = await createImageBitmap(file);
      try {
        const c = document.createElement("canvas");
        const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
        c.width = Math.max(1, Math.round(bitmap.width * scale));
        c.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = c.getContext("2d");
        if (!context) throw new Error("Não foi possível preparar a imagem.");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, c.width, c.height);
        context.drawImage(bitmap, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", 0.78);
        if (data.length > 500000)
          throw new Error("Imagem muito complexa. Escolha uma menor.");
        setImage(data);
      } finally {
        bitmap.close();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Seu humor, sua galeria."
      description="Crie um meme com texto ou adicione uma imagem sua."
    >
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !bottom.trim() || busy) return;
          onSave({
            id: crypto.randomUUID(),
            title: title.trim(),
            bottom: bottom.trim(),
            emoji: "🫠",
            category,
            tone: "yellow",
            ...(image ? { image } : {}),
          });
        }}
      >
        <label>
          Texto de cima
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={90}
            required
            placeholder="EU TENTANDO SER FITNESS"
          />
        </label>
        <label>
          Texto de baixo
          <input
            value={bottom}
            onChange={(e) => setBottom(e.target.value)}
            maxLength={120}
            required
            placeholder="Subir a escada já conta, né?"
          />
        </label>
        <label>
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Meme["category"])}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Imagem opcional (até 2 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        {image && (
          <div className="upload-preview">
            <img src={image} alt="Prévia do meme" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setImage(undefined)}
            >
              Remover imagem
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <p className="muted small">
          Use imagens próprias ou com permissão de uso. A imagem é reduzida e
          fica salva apenas neste navegador.
        </p>
        <Button type="submit" disabled={busy}>
          {busy ? "Preparando imagem…" : "Adicionar à coleção"}
        </Button>
      </form>
    </Modal>
  );
}
