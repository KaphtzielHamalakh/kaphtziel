(() => {
  // passage.js
  var passage = {
    "edition": "Unicode/XML Leningrad Codex (UXLC) 2.6, build 27.7",
    "source": "https://www.tanach.us/Books/Genesis.xml",
    "terms": "Biblical Hebrew text may be viewed or copied without restriction. https://www.tanach.us/License.html",
    "retrieved": "2026-11-18",
    "sourceSha256": "6c1aa3a69b57b77332d054f3ae9a01faa79b5fb1c2e7d08995a1ace82ff5a92b",
    "verses": [
      {
        "reference": "Genesis 1:1",
        "number": 1,
        "words": [
          {
            "id": "gen-1-1-1",
            "sourceHebrew": "בְּרֵאשִׁ֖ית"
          },
          {
            "id": "gen-1-1-2",
            "sourceHebrew": "בָּרָ֣א"
          },
          {
            "id": "gen-1-1-3",
            "sourceHebrew": "אֱלֹהִ֑ים"
          },
          {
            "id": "gen-1-1-4",
            "sourceHebrew": "אֵ֥ת"
          },
          {
            "id": "gen-1-1-5",
            "sourceHebrew": "הַשָּׁמַ֖יִם"
          },
          {
            "id": "gen-1-1-6",
            "sourceHebrew": "וְאֵ֥ת"
          },
          {
            "id": "gen-1-1-7",
            "sourceHebrew": "הָאָֽרֶץ׃"
          }
        ]
      },
      {
        "reference": "Genesis 1:2",
        "number": 2,
        "words": [
          {
            "id": "gen-1-2-1",
            "sourceHebrew": "וְהָאָ֗רֶץ"
          },
          {
            "id": "gen-1-2-2",
            "sourceHebrew": "הָיְתָ֥ה"
          },
          {
            "id": "gen-1-2-3",
            "sourceHebrew": "תֹ֙הוּ֙"
          },
          {
            "id": "gen-1-2-4",
            "sourceHebrew": "וָבֹ֔הוּ"
          },
          {
            "id": "gen-1-2-5",
            "sourceHebrew": "וְחֹ֖שֶׁךְ"
          },
          {
            "id": "gen-1-2-6",
            "sourceHebrew": "עַל־"
          },
          {
            "id": "gen-1-2-7",
            "sourceHebrew": "פְּנֵ֣י"
          },
          {
            "id": "gen-1-2-8",
            "sourceHebrew": "תְה֑וֹם"
          },
          {
            "id": "gen-1-2-9",
            "sourceHebrew": "וְר֣וּחַ"
          },
          {
            "id": "gen-1-2-10",
            "sourceHebrew": "אֱלֹהִ֔ים"
          },
          {
            "id": "gen-1-2-11",
            "sourceHebrew": "מְרַחֶ֖פֶת"
          },
          {
            "id": "gen-1-2-12",
            "sourceHebrew": "עַל־"
          },
          {
            "id": "gen-1-2-13",
            "sourceHebrew": "פְּנֵ֥י"
          },
          {
            "id": "gen-1-2-14",
            "sourceHebrew": "הַמָּֽיִם׃"
          }
        ]
      },
      {
        "reference": "Genesis 1:3",
        "number": 3,
        "words": [
          {
            "id": "gen-1-3-1",
            "sourceHebrew": "וַיֹּ֥אמֶר"
          },
          {
            "id": "gen-1-3-2",
            "sourceHebrew": "אֱלֹהִ֖ים"
          },
          {
            "id": "gen-1-3-3",
            "sourceHebrew": "יְהִ֣י"
          },
          {
            "id": "gen-1-3-4",
            "sourceHebrew": "א֑וֹר"
          },
          {
            "id": "gen-1-3-5",
            "sourceHebrew": "וַֽיְהִי־"
          },
          {
            "id": "gen-1-3-6",
            "sourceHebrew": "אֽוֹר׃"
          }
        ]
      }
    ]
  };

  // music.js
  var syllableDrafts = [
    [[1, 2, 3], ["bə", "rē", "shīt"], 2],
    [[1, 2], ["bā", "rā"], 1],
    [[1, 1, 3], ["e", "lo", "hīm"], 2],
    [[2], ["ēt"], 0],
    [[1, 1, 1, 2], ["ha", "shā", "ma", "yim"], 2],
    [[1, 2], ["və", "ēt"], 1],
    [[1, 1, 2], ["hā", "ā", "rets"], 1],
    [[1, 1, 1, 2], ["və", "hā", "ā", "rets"], 2],
    [[1, 1, 2], ["hā", "yə", "tāh"], 2],
    [[1, 2], ["to", "hu"], 0],
    [[1, 1, 2], ["vā", "vo", "hu"], 1],
    [[1, 1, 2], ["və", "cho", "shekh"], 1],
    [[2], ["al"], 0],
    [[1, 2], ["pə", "nē"], 1],
    [[1, 3], ["tə", "hom"], 1],
    [[1, 2, 1], ["və", "ru", "ach"], 1],
    [[1, 1, 3], ["e", "lo", "hīm"], 2],
    [[1, 1, 1, 2], ["mə", "ra", "che", "fet"], 2],
    [[2], ["al"], 0],
    [[1, 2], ["pə", "nē"], 1],
    [[1, 1, 2], ["ha", "ma", "yim"], 1],
    [[1, 2, 2], ["vai", "yo", "mer"], 1],
    [[1, 1, 3], ["e", "lo", "hīm"], 2],
    [[1, 2], ["yə", "hi"], 1],
    [[3], ["or"], 0],
    [[1, 1, 2], ["vai", "yə", "hi"], 2],
    [[3], ["or"], 0]
  ];
  var groupEnds = [2, 6, 10, 14, 16, 20, 24, 26];
  var melody = Object.freeze({
    id: "original-demo-01",
    revision: 1,
    name: "Original demonstration 01",
    status: "original, unreviewed",
    license: "CC0-1.0",
    description: "A newly composed note fixture for testing playback and alignment. No historical or communal attribution."
  });
  var accentNames = {
    "֑": "Etnaḥta",
    "֔": "Zakef katon",
    "֗": "Revia",
    "֙": "Pashta",
    "֣": "Munaḥ",
    "֥": "Merkha",
    "֖": "Tipḥa"
  };
  var words = passage.verses.flatMap((v) => v.words.map((w) => ({ ...w, verse: v.number, reference: v.reference }))).map((w, index) => {
    const [lengths, roman, stress] = syllableDrafts[index];
    const clusters = [...w.sourceHebrew.matchAll(/[\u05d0-\u05ea][^\u05d0-\u05ea]*/gu)].map((m) => m[0]);
    let offset = 0;
    const syllables = lengths.map((n, i) => {
      const text = clusters.slice(offset, offset + n).join("");
      offset += n;
      return { id: `${w.id}-s${i + 1}`, sourceHebrew: text, roman: roman[i], stress: i === stress, phonemes: null, reviewStatus: "draft" };
    });
    if (offset !== clusters.length || syllables.map((s) => s.sourceHebrew).join("") !== w.sourceHebrew) throw Error(`Alignment mismatch: ${w.id}`);
    return {
      ...w,
      index,
      syllables,
      group: groupEnds.findIndex((e) => e >= index),
      groupEnd: groupEnds.includes(index),
      accent: w.sourceHebrew.endsWith("׃") ? "Silluq / sof pasuq" : Object.entries(accentNames).find(([c]) => w.sourceHebrew.includes(c))?.[1] || "Joined by maqaf"
    };
  });
  var consonantal = (text) => text.replace(/[\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u200d\u034f]/gu, "");
  function bounds(cursor, anchor, scope) {
    if (scope === "selection") return [Math.min(cursor, anchor), Math.max(cursor, anchor)];
    if (scope === "word") return [cursor, cursor];
    if (scope === "passage") return [cursor, words.length - 1];
    const field = scope === "group" ? "group" : "verse";
    let end = cursor;
    while (end + 1 < words.length && words[end + 1][field] === words[cursor][field]) end++;
    return [cursor, end];
  }
  var events = Object.freeze(words.flatMap((w) => w.syllables.flatMap((s, i) => {
    const seed = [62, 64, 65, 67][w.index % 4];
    const pitches = w.groupEnd && i === w.syllables.length - 1 ? [65, 64, 62] : [seed + (i % 2 ? 2 : 0)];
    return pitches.map((midi, j) => Object.freeze({
      id: `${s.id}-n${j + 1}`,
      wordId: w.id,
      wordIndex: w.index,
      syllableId: s.id,
      syllable: s.sourceHebrew,
      roman: s.roman,
      phonemes: s.phonemes,
      midi,
      beats: pitches.length > 1 ? 0.5 : s.stress ? 0.9 : 0.6,
      part: j + 1
    }));
  })));
  function buildPlan(start, end, { tempo = 84, transpose = 0 } = {}) {
    let beat = 0;
    return events.filter((e) => e.wordIndex >= start && e.wordIndex <= end).map((e) => {
      const event = { ...e, midi: e.midi + transpose, startBeat: beat, startSeconds: beat * 60 / tempo, durationSeconds: e.beats * 60 / tempo };
      beat += e.beats;
      return event;
    });
  }
  var frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
  var noteName = (midi) => ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"][(midi % 12 + 12) % 12] + (Math.floor(midi / 12) - 1);

  // audio.js
  var Player = class {
    constructor(onFrame, onEnd) {
      this.onFrame = onFrame;
      this.onEnd = onEnd;
      this.generation = 0;
      this.sources = [];
    }
    async play(plan2, repeat = false) {
      this.stop();
      const generation = this.generation;
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      await this.context.resume();
      if (generation !== this.generation) return;
      this.plan = plan2;
      this.repeat = repeat;
      this.cycle = 0;
      this.running = true;
      this.duration = plan2.at(-1).startSeconds + plan2.at(-1).durationSeconds;
      this.start = this.context.currentTime + 0.06;
      this.schedule(this.start);
      this.next = this.start + this.duration;
      if (this.repeat) {
        this.schedule(this.next);
        this.next += this.duration;
      }
      const frame = () => {
        if (generation !== this.generation || !this.running) return;
        const now = this.context.currentTime;
        this.sources = this.sources.filter((s) => s.end > now);
        if (this.repeat && now + 0.2 >= this.next) {
          this.schedule(this.next);
          this.next += this.duration;
        }
        const elapsed = Math.max(0, now - this.start);
        if (!this.repeat && elapsed >= this.duration) {
          this.running = false;
          this.onEnd();
          return;
        }
        const cycle = Math.floor(elapsed / this.duration);
        const position = this.repeat ? elapsed % this.duration : elapsed;
        const event = this.plan.find((e) => position >= e.startSeconds && position < e.startSeconds + e.durationSeconds);
        if (event && now >= this.start) this.onFrame(event, cycle, position / this.duration);
        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    }
    schedule(start) {
      for (const e of this.plan) {
        const oscillator = this.context.createOscillator(), gain = this.context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency(e.midi);
        const at = start + e.startSeconds, end = at + e.durationSeconds;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.16, at + Math.min(0.012, e.durationSeconds / 4));
        gain.gain.setValueAtTime(0.12, Math.max(at + 0.012, end - 0.025));
        gain.gain.linearRampToValueAtTime(0, end);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(at);
        oscillator.stop(end);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        this.sources.push({ oscillator, end });
      }
    }
    stop() {
      this.generation++;
      this.running = false;
      cancelAnimationFrame(this.raf);
      for (const s of this.sources) {
        try {
          s.oscillator.stop();
        } catch {
        }
      }
      this.sources = [];
    }
  };

  // app.js
  var $ = (id) => document.getElementById(id);
  var state = { cursor: 0, anchor: 0, view: "pointed", scope: "group", tempo: 84, transpose: 0, repeat: false, groups: true, rangeLow: 60, rangeHigh: 72 };
  try {
    const saved = JSON.parse(localStorage.getItem("tropetrain-practice-v1"));
    if (saved) {
      for (const k of ["cursor", "anchor"]) if (Number.isInteger(saved[k]) && saved[k] >= 0 && saved[k] < words.length) state[k] = saved[k];
      if (["pointed", "consonantal", "parallel"].includes(saved.view)) state.view = saved.view;
      if (["word", "group", "verse", "selection", "passage"].includes(saved.scope)) state.scope = saved.scope;
      for (const [key, min, max] of [["tempo", 40, 160], ["transpose", -12, 12], ["rangeLow", 36, 84], ["rangeHigh", 36, 84]]) if (Number.isInteger(saved[key]) && saved[key] >= min && saved[key] <= max) state[key] = saved[key];
      for (const k of ["groups", "repeat"]) if (typeof saved[k] === "boolean") state[k] = saved[k];
    }
  } catch {
  }
  var chooseEnd = false;
  var plan = [];
  var activeId = null;
  var playingBounds = null;
  var persist = () => {
    try {
      localStorage.setItem("tropetrain-practice-v1", JSON.stringify(state));
    } catch {
    }
  };
  var label = (i) => `1:${words[i].verse} · word ${Number(words[i].id.split("-").at(-1))}`;
  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    document.querySelectorAll("[data-word]").forEach((el) => el.classList.toggle("active", el.dataset.word === id));
  }
  var player = new Player((event, cycle, progress) => {
    setActive(event.wordId);
    document.querySelectorAll("[data-event]").forEach((el) => el.classList.toggle("active", el.dataset.event === event.id));
    $("progress").style.width = `${progress * 100}%`;
    const nextStatus = `${state.repeat ? `Loop ${cycle + 1} · ` : ""}Playing ${label(event.wordIndex)} · ${noteName(event.midi)}`;
    $("status").textContent = nextStatus;
  }, () => {
    setActive(null);
    $("progress").style.width = "100%";
    document.querySelectorAll("[data-event]").forEach((el) => el.classList.remove("active"));
    $("status").setAttribute("aria-live", "polite");
    $("status").textContent = `Finished at ${label(playingBounds[1])}.`;
    $("play").innerHTML = '<span aria-hidden="true">▶</span> Play';
  });
  function stop(message = "Stopped. Your selection is kept.") {
    player.stop();
    setActive(null);
    $("progress").style.width = "0%";
    document.querySelectorAll("[data-event]").forEach((el) => el.classList.remove("active"));
    $("status").setAttribute("aria-live", "polite");
    $("status").textContent = message;
    $("play").innerHTML = '<span aria-hidden="true">▶</span> Play';
  }
  async function play() {
    playingBounds = bounds(state.cursor, state.anchor, state.scope);
    plan = buildPlan(...playingBounds, state);
    renderSequence();
    $("status").setAttribute("aria-live", "off");
    $("play").innerHTML = '<span aria-hidden="true">▶</span> Restart';
    try {
      await player.play(plan, state.repeat);
    } catch (error) {
      stop(`Audio unavailable: ${error.message}. Try a browser with Web Audio support.`);
    }
  }
  function selectWord(index, extend = false) {
    stop("Ready to listen.");
    if (extend || chooseEnd) {
      state.cursor = index;
      state.scope = "selection";
      chooseEnd = false;
    } else {
      state.cursor = index;
      state.anchor = index;
    }
    render();
  }
  function wordButton(w, plain) {
    const b = document.createElement("button");
    b.className = `word group-${w.group % 2 ? "odd" : "even"}${w.groupEnd ? " group-end" : ""}`;
    b.dataset.word = w.id;
    b.dataset.index = w.index;
    b.textContent = plain ? consonantal(w.sourceHebrew) : w.sourceHebrew;
    b.lang = "he";
    b.dir = "rtl";
    b.title = `${w.reference}, word ${w.id.split("-").at(-1)} · ${w.accent}`;
    b.setAttribute("aria-label", `${b.textContent}, ${w.reference}, word ${w.id.split("-").at(-1)}`);
    b.addEventListener("click", (e) => selectWord(w.index, e.shiftKey));
    b.addEventListener("dblclick", () => {
      state.cursor = w.index;
      state.anchor = w.index;
      state.scope = "word";
      render();
      play();
    });
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const i = Math.max(0, Math.min(words.length - 1, w.index + (e.key === "ArrowLeft" ? 1 : -1)));
        selectWord(i, e.shiftKey);
        document.querySelector(`[data-word="${words[i].id}"]`).focus();
      }
    });
    return b;
  }
  function renderReader() {
    $("reader").replaceChildren();
    $("reader").classList.toggle("guides", state.groups);
    if (state.view === "parallel") {
      const headings = document.createElement("div");
      headings.className = "parallel-headings";
      headings.innerHTML = "<span>Consonantal practice</span><span>Pointed source</span>";
      $("reader").append(headings);
    }
    for (const verse of passage.verses) {
      const row = document.createElement("div");
      row.className = "verse";
      const number = document.createElement("span");
      number.className = "verse-number";
      number.textContent = `${verse.number}`;
      row.append(number);
      const lines = document.createElement("div");
      if (state.view === "parallel") lines.className = "parallel-lines";
      for (const plain of state.view === "parallel" ? [true, false] : [state.view === "consonantal"]) {
        const line = document.createElement("div");
        line.className = "hebrew-line";
        line.lang = "he";
        line.dir = "rtl";
        for (const word of words.filter((w) => w.verse === verse.number)) {
          line.append(wordButton(word, plain), document.createTextNode(" "));
        }
        lines.append(line);
      }
      row.append(lines);
      $("reader").append(row);
    }
    const note = document.createElement("p");
    note.className = "layout-note";
    note.textContent = "Group guides: major practice divisions only. " + (state.view === "pointed" ? "Source marks are preserved verbatim." : "Consonantal practice uses print letters and responsive lines; this is not a scroll facsimile.");
    $("reader").append(note);
    updateSelection();
  }
  function updateSelection() {
    const [start, end] = bounds(state.cursor, state.anchor, state.scope);
    document.querySelectorAll("[data-word]").forEach((el) => {
      const i = Number(el.dataset.index);
      el.classList.toggle("selected", i >= start && i <= end);
      el.classList.toggle("cursor", i === state.cursor);
      el.classList.toggle("active", el.dataset.word === activeId);
      el.setAttribute("aria-pressed", String(i >= start && i <= end));
    });
    $("selection-label").textContent = state.scope === "selection" ? `Selected ${label(start)} to ${label(end)}` : `Cursor: Genesis ${label(state.cursor)}`;
    $("span-preview").textContent = `Genesis ${label(start)} to ${label(end)} · ${end - start + 1} word${end > start ? "s" : ""}`;
    $("compact-span").textContent = `${label(start)}–${label(end)}`;
    $("end-selection").setAttribute("aria-pressed", String(chooseEnd));
    $("end-selection").textContent = chooseEnd ? "Click the last word" : "Choose span end";
    const w = words[state.cursor];
    $("current-word").textContent = w.sourceHebrew;
    $("current-reference").textContent = `${w.reference} · word ${w.id.split("-").at(-1)}`;
    $("accent-name").textContent = w.accent;
    $("group-name").textContent = `Practice group ${w.group + 1} · ${w.id}`;
  }
  function renderSequence() {
    plan = buildPlan(...bounds(state.cursor, state.anchor, state.scope), state);
    $("event-count").textContent = `${plan.length} events · ${(plan.at(-1).startSeconds + plan.at(-1).durationSeconds).toFixed(2)} s`;
    $("note-ribbon").replaceChildren();
    $("event-rows").replaceChildren();
    for (const e of plan) {
      const chip = document.createElement("div");
      chip.className = "note-chip";
      chip.dataset.event = e.id;
      const pitch = document.createElement("span");
      pitch.className = "pitch";
      pitch.textContent = noteName(e.midi);
      const stem = document.createElement("span");
      stem.className = "note-stem";
      stem.setAttribute("aria-hidden", "true");
      const syllable = document.createElement("span");
      syllable.className = "syllable";
      syllable.lang = "he";
      syllable.dir = "rtl";
      syllable.textContent = e.syllable;
      const length = document.createElement("span");
      length.className = "length";
      length.textContent = `${e.beats} beats`;
      chip.append(pitch, stem, syllable, length);
      $("note-ribbon").append(chip);
      const row = document.createElement("tr");
      row.dataset.event = e.id;
      for (const [i, value] of [e.wordId, e.syllable, noteName(e.midi), e.midi, e.startBeat.toFixed(2), e.beats, e.durationSeconds.toFixed(3)].entries()) {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (i === 1) {
          cell.lang = "he";
          cell.dir = "rtl";
        }
        row.append(cell);
      }
      $("event-rows").append(row);
    }
    const out = plan.filter((e) => e.midi < state.rangeLow || e.midi > state.rangeHigh).length;
    $("range-report").textContent = state.rangeLow > state.rangeHigh ? "Lowest note must be below highest note." : `${out} of ${plan.length} notes outside ${noteName(state.rangeLow)}–${noteName(state.rangeHigh)}.`;
  }
  function render() {
    for (const key of ["scope", "tempo", "transpose"]) $(key).value = state[key];
    for (const key of ["repeat", "groups"]) $(key).checked = state[key];
    $("range-low").value = state.rangeLow;
    $("range-high").value = state.rangeHigh;
    $("tempo-value").textContent = `${state.tempo} BPM`;
    $("transpose-value").textContent = `${state.transpose > 0 ? "+" : ""}${state.transpose} semitone${Math.abs(state.transpose) !== 1 ? "s" : ""}`;
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    renderReader();
    renderSequence();
    persist();
  }
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    state.view = b.dataset.view;
    render();
  }));
  $("groups").addEventListener("change", (e) => {
    state.groups = e.target.checked;
    render();
  });
  $("scope").addEventListener("change", (e) => {
    stop("Ready to listen.");
    state.scope = e.target.value;
    render();
  });
  $("end-selection").addEventListener("click", () => {
    chooseEnd = !chooseEnd;
    updateSelection();
  });
  $("play").addEventListener("click", play);
  $("stop").addEventListener("click", () => stop());
  $("compact-play").addEventListener("click", play);
  $("compact-stop").addEventListener("click", () => stop());
  $("repeat").addEventListener("change", (e) => {
    const running = player.running;
    state.repeat = e.target.checked;
    persist();
    if (running) play();
  });
  function changeSound(key, value, min, max) {
    if (!Number.isFinite(value)) return;
    const running = player.running;
    state[key] = Math.min(max, Math.max(min, Math.round(value)));
    stop("Settings changed. Ready to listen.");
    render();
    if (running) play();
  }
  $("tempo").addEventListener("input", (e) => changeSound("tempo", Number(e.target.value), 40, 160));
  $("transpose").addEventListener("change", (e) => changeSound("transpose", Number(e.target.value), -12, 12));
  $("pitch-up").addEventListener("click", () => changeSound("transpose", state.transpose + 1, -12, 12));
  $("pitch-down").addEventListener("click", () => changeSound("transpose", state.transpose - 1, -12, 12));
  for (const [id, key] of [["range-low", "rangeLow"], ["range-high", "rangeHigh"]]) {
    for (let midi = 36; midi <= 84; midi++) {
      const o = document.createElement("option");
      o.value = midi;
      o.textContent = noteName(midi);
      $(id).append(o);
    }
    $(id).addEventListener("change", (e) => {
      state[key] = Number(e.target.value);
      renderSequence();
      persist();
    });
  }
  $("download").addEventListener("click", () => {
    const [start, end] = bounds(state.cursor, state.anchor, state.scope);
    const exported = {
      format: "tropetrain-events-v1",
      textSource: { ...passage, verses: void 0 },
      melody,
      pronunciation: { id: null, status: "not implemented" },
      vocalRange: { low: state.rangeLow, high: state.rangeHigh, mode: "advisory" },
      tempo: state.tempo,
      transpose: state.transpose,
      startWordId: words[start].id,
      endWordId: words[end].id,
      words: words.slice(start, end + 1),
      events: plan
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tropetrain-genesis-events.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      stop();
      return;
    }
    if (e.key === "F2") {
      e.preventDefault();
      stop();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && player.running) stop("Paused because this tab is hidden. Press Play to restart the span.");
  });
  render();
  document.documentElement.dataset.ready = "true";
  $("startup-status").hidden = true;
  if (location.protocol === "file:") $("offline-status").textContent = "Local file · ready without a server";
  else if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").then(() => navigator.serviceWorker.ready).then(() => {
    $("offline-status").textContent = "Local audio · available offline after first load";
  }).catch(() => {
  });
})();
