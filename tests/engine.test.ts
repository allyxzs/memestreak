import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archiveHabit,
  breaks,
  dateKey,
  parseDate,
  setLog,
  shift,
  stats,
  type Habit,
} from "../lib/engine";
import { decode, initialState } from "../lib/store";
const make = (changes: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Ler",
  emoji: "📚",
  days: [0, 1, 2, 3, 4, 5, 6],
  goal: 7,
  created: "2026-11-20",
  archived: false,
  logs: {},
  ...changes,
});
test("an open today does not erase yesterday’s streak", () => {
  const h = make({ logs: { "2026-11-20": "done", "2026-11-21": "done" } });
  assert.deepEqual(stats(h, "2026-11-22"), {
    current: 2,
    best: 2,
    total: 2,
    opportunities: 2,
    skipped: 0,
    consistency: 100,
  });
  assert.deepEqual(breaks(h, "2026-11-22"), []);
});
test("a missed scheduled day resets streak and emits one event per break", () => {
  const h = make({ logs: { "2026-11-20": "done" } });
  assert.equal(stats(h, "2026-11-24").current, 0);
  assert.deepEqual(breaks(h, "2026-11-24"), ["h1:2026-11-21"]);
});
test("rest days do not count or reset a streak", () => {
  const h = make({
    days: [1, 3, 5],
    logs: { "2026-11-20": "done", "2026-11-23": "done" },
  });
  assert.equal(stats(h, "2026-11-24").current, 2);
  assert.equal(stats(h, "2026-11-24").opportunities, 2);
  assert.deepEqual(breaks(h, "2026-11-24"), []);
});
test("skipping today counts immediately and breaks the run", () => {
  const h = make({ logs: { "2026-11-20": "done", "2026-11-21": "skipped" } });
  assert.equal(stats(h, "2026-11-21").current, 0);
  assert.equal(stats(h, "2026-11-21").consistency, 50);
  assert.deepEqual(breaks(h, "2026-11-21"), ["h1:2026-11-21"]);
});
test("record correction restores the run, undo does not duplicate completions", () => {
  let h = make({
    logs: {
      "2026-11-20": "done",
      "2026-11-21": "skipped",
      "2026-11-22": "done",
    },
  });
  h = setLog(h, "2026-11-21", "done", "2026-11-22");
  h = setLog(h, "2026-11-21", "done", "2026-11-22");
  assert.equal(stats(h, "2026-11-22").current, 3);
  assert.equal(stats(h, "2026-11-22").total, 3);
  h = setLog(h, "2026-11-22", undefined, "2026-11-22");
  assert.equal(stats(h, "2026-11-22").current, 2);
});
test("reject future, before-creation and off-schedule writes", () => {
  const h = make({ days: [5] });
  for (const d of ["2026-11-19", "2026-11-21", "2026-11-27"])
    assert.throws(() => setLog(h, d, "done", "2026-11-22"));
});
test("record persists as local date through DST, leap day and year boundaries", () => {
  assert.equal(shift("2024-02-28", 1), "2024-02-29");
  assert.equal(shift("2026-12-31", 1), "2027-01-01");
  assert.equal(shift("2026-03-08", 1), "2026-03-09");
  assert.equal(dateKey(parseDate("2026-11-23")), "2026-11-23");
});
test("future log does not inflate historical stats", () => {
  const h = make({ logs: { "2026-11-20": "done", "2026-11-25": "done" } });
  assert.equal(stats(h, "2026-11-21").total, 1);
});
test("empty state roundtrips; malicious image URLs and malformed dates fail", () => {
  assert.deepEqual(decode(JSON.stringify(initialState())), initialState());
  const state = {
    ...initialState(),
    habits: [make({ created: "2026-02-30" })],
  };
  assert.throws(() => decode(JSON.stringify(state)));
  assert.throws(() =>
    decode(
      JSON.stringify({
        ...initialState(),
        memes: [
          {
            id: "x",
            title: "x",
            bottom: "x",
            emoji: "x",
            category: "Recomeço",
            tone: "pink",
            image: "javascript:alert(1)",
          },
        ],
      }),
    ),
  );
});
test("backup rejects duplicate IDs and off-schedule logs", () => {
  assert.throws(() =>
    decode(JSON.stringify({ ...initialState(), habits: [make(), make()] })),
  );
  assert.throws(() =>
    decode(
      JSON.stringify({
        ...initialState(),
        habits: [make({ days: [5], logs: { "2026-11-21": "done" } })],
      }),
    ),
  );
});

test("archiving pauses scheduled opportunities and resuming preserves history", () => {
  let h = make({ logs: { "2026-11-20": "done" } });
  h = archiveHabit(h, "2026-11-21");
  assert.equal(stats(h, "2026-11-25").current, 1);
  assert.equal(stats(h, "2026-11-25").opportunities, 1);
  h = archiveHabit(h, "2026-11-25");
  h = setLog(h, "2026-11-25", "done", "2026-11-25");
  assert.equal(stats(h, "2026-11-25").current, 2);
  assert.deepEqual(breaks(h, "2026-11-25"), []);
  assert.doesNotThrow(() =>
    decode(JSON.stringify({ ...initialState(), habits: [h] })),
  );
});
test("same-day archive and restore do not exclude completed days", () => {
  let h = make({ logs: { "2026-11-20": "done" } });
  h = archiveHabit(h, "2026-11-20");
  h = archiveHabit(h, "2026-11-20");
  assert.deepEqual(h.pauses, []);
  assert.equal(stats(h, "2026-11-20").total, 1);
});
