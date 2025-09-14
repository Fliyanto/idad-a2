/* =========================================
   main.js — Floating Bubbles + Modal + Audio
   + Horizontal Volume Bubble Cluster (fixed tube geometry)
   ========================================= */

(() => {
  /* ---------- DOM ---------- */
  const stage = document.getElementById("bubbleStage");

  // Instrument modal
  const modal = document.getElementById("instrumentModal");
  const modalClose = document.getElementById("modalClose");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const metaRegion = document.getElementById("metaRegion");
  const metaMaterials = document.getElementById("metaMaterials");
  const metaPron = document.getElementById("metaPronunciation");
  const metaDate = document.getElementById("metaDate");

  // Audio notice
  const audioNotice = document.getElementById("audioNotice");
  const audioNoticeOk = document.getElementById("audioNoticeOk"); // “Accept”
  const audioNoticeMute = document.getElementById("audioNoticeMute");
  const audioNoticeDont = document.getElementById("audioNoticeDont");

  // Header controls
  const muteToggle = document.getElementById("muteToggle");
  const helpToggle = document.getElementById("helpToggle");
  const helpPanel = document.getElementById("helpPanel");

  // Volume cluster
  const volCluster = document.querySelector(".volume-cluster");
  const volControls = {
    master: document.querySelector('.vol-control[data-kind="master"]'),
    lobby: document.querySelector('.vol-control[data-kind="lobby"]'),
    instr: document.querySelector('.vol-control[data-kind="instrument"]'),
  };

  // Audio elements
  const player = document.getElementById("player"); // instrument clips
  const lobby = document.getElementById("lobby"); // background music
  player.loop = false;

  /* ---------- Config ---------- */
  const PHYS = {
    SIZE_MIN: 160,
    SIZE_MAX: 260,
    SPEED_MIN: 12,
    SPEED_MAX: 28,
    EDGE_PAD: 6,
    MAX_DT: 0.05,
    BREATH_AMP_MIN: 0.12,
    BREATH_AMP_MAX: 0.35,
    BREATH_PER_MIN: 3.2,
    BREATH_PER_MAX: 6.8,
    SWAY_X: 0.8,
    SWAY_Y: 0.8,
    BOUNCE_JITTER: 0.12,
  };

  const FADE = {
    LOBBY_IN_MS: 300,
    LOBBY_OUT_MS: 220,
    INSTR_IN_MS: 900,
    INSTR_OUT_MS: 220,
  };

  // Volume steps → gain multipliers
  const STEPS = [0.0, 0.25, 0.5, 0.75, 1.0];
  const stepToPct = (s) => s * 25; // 0..4 → 0..100

  /* ---------- Data ---------- */
  const INSTRUMENTS = [
    {
      id: "kendang",
      name: "Kendang",
      region: "Java, Sunda, Bali",
      materials: "Wood (jackfruit/coconut), cow/goat skin",
      description:
        "The kendang is the heartbeat of Indonesian gamelan! This two-headed drum sets the rhythm for dancers and musicians alike. Played with hands or sticks depending on the region, the kendang leads transitions in both traditional ceremonies and dramatic dance battles. In Java and Bali, different sizes create different emotional tones—fast, slow, tense, or joyful. It's an ancient instrument believed to be around since the 8th century!",
      pronunciation: "kuhn-dahng",
      date: "800 CE",
      tracks: [],
    },

    {
      id: "sasando",
      name: "Sasando",
      region: "Rote Island, East Nusa Tenggara",
      materials: "Bamboo, palm leaves, strings",
      description:
        "Shaped like a blooming flower, the sasando is a harp-like instrument that sings with the winds of Rote Island. Made from bamboo with palm leaf resonators, it has a magical, delicate sound that once entertained kings. Traditionally used in lullabies and love songs, the sasando is now played on global stages, bringing the warmth of East Indonesia to the world!",
      pronunciation: "sah-sahn-do",
      date: "1673 CE",
      tracks: [],
    },

    {
      id: "angklung",
      name: "Angklung",
      region: "West Java (Sundanese)",
      materials: "Bamboo",
      description:
        "The angklung is a bamboo rattle that turns shaking into symphony! Each instrument plays one note, so teamwork is key—just like a musical relay race. Used in ceremonies, education, and world peace events, the angklung is so iconic, it's recognized by UNESCO as a cultural treasure. Its joyful clatter has echoed across villages for centuries.",
      pronunciation: "ahng-kloong",
      date: "13th century (first record: 1300s CE)",
      tracks: ["audio/angklungAudio.mp3"],
    },

    {
      id: "gong",
      name: "Gong Ageng",
      region: "Java & Bali",
      materials: "Bronze",
      description:
        "Meet the mighty gong ageng—the grandparent of all gongs! It's the biggest and deepest-toned gong in the gamelan, marking the end of musical cycles with a majestic boom. Its sound isn’t just musical—it’s spiritual, believed to connect the human and divine. Crafted with care by master bronze-smiths, each gong is a sacred presence in ceremonies.",
      pronunciation: "gong ah-guhng",
      date: "900 CE",
      tracks: [],
    },

    {
      id: "kolintang",
      name: "Kolintang",
      region: "North Sulawesi (Minahasa)",
      materials: "Local light wood (wunu, cempaka)",
      description:
        "The kolintang is a wooden xylophone that brings joy with every tap! Originating from Minahasa, it was once used in ancestor worship and later evolved into a community instrument for weddings and church services. With its bright, bell-like tones, it creates melodies that dance through the air. Modern kolintang ensembles now include bass and melody instruments!",
      pronunciation: "koh-lin-tahng",
      date: "1650 CE",
      tracks: [],
    },

    {
      id: "suling",
      name: "Suling",
      region: "Across Indonesia (notably West Java, Bali)",
      materials: "Bamboo",
      description:
        "The suling is a breath of bamboo magic. This end-blown flute produces sweet, airy tones that can sound like birdsong or a soft whisper. Played solo or with gamelan, it’s a key part of Sundanese and Balinese music. The suling is lightweight but emotionally powerful—often used in moments of reflection or peace.",
      pronunciation: "soo-ling",
      date: "800 CE",
      tracks: ["audio/sulingAudio.mp3"],
    },

    {
      id: "gamelan",
      name: "Gamelan Gender / Saron",
      region: "Java & Bali",
      materials: "Bronze bars, wooden frame, mallet",
      description:
        "Part of the mighty gamelan family, the gender and saron are melodic metallophones with shimmering sounds. The saron plays strong, clear notes—like a melodic skeleton—while the gender adds ornamentation with its fast, flowing tones. Together, they form the storytelling voice of gamelan music, used in ceremonies, dance, and shadow puppetry.",
      pronunciation: "gen-dair / sah-ron",
      date: "800 CE",
      tracks: ["audio/gamelanAudio.mp3"],
    },
  ];

  /* ---------- Utils ---------- */
  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const stageSize = () => {
    const r = stage.getBoundingClientRect();
    return {
      w: r.width || innerWidth || 1024,
      h: r.height || innerHeight || 768,
    };
  };

  /* ---------- Bubbles ---------- */
  const bubbles = []; // {el,w,h,cx,cy,vx,vy,amp,omega,phase,swaySeed}

  function initBubbles() {
    const nodes = [...stage.querySelectorAll(".bubble")];
    const { w: W, h: H } = stageSize();
    nodes.forEach((el) => {
      const size = Math.round(rand(PHYS.SIZE_MIN, PHYS.SIZE_MAX));
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      const half = size / 2;
      const cx = rand(
        PHYS.EDGE_PAD + half,
        Math.max(PHYS.EDGE_PAD + half, W - (PHYS.EDGE_PAD + half))
      );
      const cy = rand(
        PHYS.EDGE_PAD + half,
        Math.max(PHYS.EDGE_PAD + half, H - (PHYS.EDGE_PAD + half))
      );
      const ang = rand(0, Math.PI * 2),
        speed = rand(PHYS.SPEED_MIN, PHYS.SPEED_MAX);
      const vx = Math.cos(ang) * speed,
        vy = Math.sin(ang) * speed;
      const amp = rand(PHYS.BREATH_AMP_MIN, PHYS.BREATH_AMP_MAX);
      const per = rand(PHYS.BREATH_PER_MIN, PHYS.BREATH_PER_MAX);
      const omega = (Math.PI * 2) / per,
        phase = rand(0, Math.PI * 2);
      const swaySeed = rand(-1000, 1000);
      const s = 1 + amp * Math.sin(phase);
      el.style.transform = `translate(${cx - size / 2}px, ${
        cy - size / 2
      }px) scale(${s})`;
      el.style.transformOrigin = "center center";
      bubbles.push({
        el,
        w: size,
        h: size,
        cx,
        cy,
        vx,
        vy,
        amp,
        omega,
        phase,
        swaySeed,
      });
    });
  }

  function collidePairs() {
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i],
          b = bubbles[j];
        const sa = 1 + a.amp * Math.sin(a.phase),
          sb = 1 + b.amp * Math.sin(b.phase);
        const ra = (a.w * sa) / 2,
          rb = (b.w * sb) / 2;
        const dx = b.cx - a.cx,
          dy = b.cy - a.cy;
        const dist = Math.hypot(dx, dy),
          minDist = ra + rb;
        if (dist > 0.0001 && dist < minDist) {
          const nx = dx / dist,
            ny = dy / dist,
            overlap = (minDist - dist) / 2;
          a.cx -= nx * overlap;
          a.cy -= ny * overlap;
          b.cx += nx * overlap;
          b.cy += ny * overlap;
          const avn = a.vx * nx + a.vy * ny,
            bvn = b.vx * nx + b.vy * ny;
          const atx = a.vx - avn * nx,
            aty = a.vy - avn * ny,
            btx = b.vx - bvn * nx,
            bty = b.vy - bvn * ny;
          a.vx = atx + bvn * nx;
          a.vy = aty + bvn * ny;
          b.vx = btx + avn * nx;
          b.vy = bty + avn * ny;
          const j = PHYS.BOUNCE_JITTER;
          a.vx *= 1 + (Math.random() - 0.5) * j;
          a.vy *= 1 + (Math.random() - 0.5) * j;
          b.vx *= 1 + (Math.random() - 0.5) * j;
          b.vy *= 1 + (Math.random() - 0.5) * j;
        }
      }
    }
  }

  let last = performance.now();
  function animate(now) {
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, PHYS.MAX_DT);
    const { w: W, h: H } = stageSize();
    for (const b of bubbles) {
      b.phase += b.omega * dt;
      const s = 1 + b.amp * Math.sin(b.phase);
      const half = (b.w * s) / 2;
      b.cx += b.vx * dt;
      b.cy += b.vy * dt;
      if (b.cx - half <= PHYS.EDGE_PAD) {
        b.cx = PHYS.EDGE_PAD + half;
        b.vx = Math.abs(b.vx);
      }
      if (b.cx + half >= W - PHYS.EDGE_PAD) {
        b.cx = W - PHYS.EDGE_PAD - half;
        b.vx = -Math.abs(b.vx);
      }
      if (b.cy - half <= PHYS.EDGE_PAD) {
        b.cy = PHYS.EDGE_PAD + half;
        b.vy = Math.abs(b.vy);
      }
      if (b.cy + half >= H - PHYS.EDGE_PAD) {
        b.cy = H - PHYS.EDGE_PAD - half;
        b.vy = -Math.abs(b.vy);
      }
    }
    collidePairs();
    for (const b of bubbles) {
      const s = 1 + b.amp * Math.sin(b.phase);
      const sx = Math.sin(now / 900 + b.swaySeed) * PHYS.SWAY_X;
      const sy = Math.cos(now / 1100 + b.swaySeed) * PHYS.SWAY_Y;
      const x = b.cx - b.w / 2 + sx,
        y = b.cy - b.h / 2 + sy;
      b.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      b.el.style.transformOrigin = "center center";
    }
    requestAnimationFrame(animate);
  }

  /* ---------- Audio plumbing (with Master gain) ---------- */
  let audioCtx, instrGain, lobbyGain, masterGain, instrSrc, lobbySrc;
  let isMuted = localStorage.getItem("prefMuted") === "1";
  let noticeDismissed = localStorage.getItem("audioNoticeDismissed") === "1";
  let lobbyPlaying = false;

  function ensureAudio() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!masterGain) {
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
    }
    if (!instrGain) {
      instrGain = audioCtx.createGain();
      instrGain.gain.value = 0;
      instrGain.connect(masterGain);
    }
    if (!lobbyGain) {
      lobbyGain = audioCtx.createGain();
      lobbyGain.gain.value = 0;
      lobbyGain.connect(masterGain);
    }
    if (!instrSrc) {
      instrSrc = audioCtx.createMediaElementSource(player);
      instrSrc.connect(instrGain);
    }
    if (!lobbySrc) {
      lobbySrc = audioCtx.createMediaElementSource(lobby);
      lobbySrc.connect(lobbyGain);
    }
  }
  async function resumeAudio() {
    ensureAudio();
    if (audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch {}
    }
  }

  async function fadeTo(elem, gainNode, targetGain, ms) {
    await resumeAudio();
    try {
      await elem.play();
    } catch {}
    const t = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(gainNode.gain.value, t);
    gainNode.gain.linearRampToValueAtTime(
      isMuted ? 0 : targetGain,
      t + ms / 1000
    );
  }
  function fadeOut(elem, gainNode, ms, reset = true) {
    if (!audioCtx || !gainNode) {
      elem.pause();
      if (reset) {
        elem.currentTime = 0;
      }
      return;
    }
    const t = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(gainNode.gain.value, t);
    gainNode.gain.linearRampToValueAtTime(0, t + ms / 1000);
    setTimeout(() => {
      elem.pause();
      if (reset) elem.currentTime = 0;
    }, ms + 30);
  }

  async function startLobbyImmediate() {
    if (isMuted || lobbyPlaying) return;
    await resumeAudio();
    try {
      await lobby.play();
    } catch {}
    const t = audioCtx.currentTime;
    lobbyGain.gain.cancelScheduledValues(t);
    lobbyGain.gain.setValueAtTime(currentLobbyTarget(), t);
    lobbyPlaying = true;
  }
  async function startLobby() {
    if (isMuted || lobbyPlaying) return;
    lobbyPlaying = true;
    await fadeTo(
      lobby,
      lobbyGain,
      currentLobbyTarget(),
      FADE.LOBBY_IN_MS
    ).catch(() => {});
  }
  function stopLobby() {
    if (!lobbyPlaying) return;
    fadeOut(lobby, lobbyGain, FADE.LOBBY_OUT_MS, /*reset=*/ false);
    lobbyPlaying = false;
  }

  /* ---------- Volume cluster state ---------- */
  // Steps (0..4) persisted
  let masterStep = parseInt(localStorage.getItem("vol_master") ?? "4", 10); // 100%
  let lobbyStep = parseInt(localStorage.getItem("vol_lobby") ?? "3", 10); // 75%
  let instrStep = parseInt(localStorage.getItem("vol_instr") ?? "4", 10); // 100%

  let prevMasterStep = masterStep;

  function currentLobbyTarget() {
    return STEPS[lobbyStep] * STEPS[masterStep];
  }
  function currentInstrTarget() {
    return STEPS[instrStep] * STEPS[masterStep];
  }

  async function applyGains() {
    ensureAudio();
    const t = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    lobbyGain.gain.cancelScheduledValues(t);
    instrGain.gain.cancelScheduledValues(t);

    const m = isMuted ? 0 : STEPS[masterStep];
    masterGain.gain.setValueAtTime(m, t);
    lobbyGain.gain.setValueAtTime(STEPS[lobbyStep], t);
    instrGain.gain.setValueAtTime(STEPS[instrStep], t);
  }

  /* ---------- Volume UI helpers ---------- */
  const PADS = { top: 12, bottom: 12 }; // must match CSS .tube-track paddings
  const HANDLE_HALF = 8; // 16px handle → center offset

  function clampStep(s) {
    return Math.max(0, Math.min(4, s | 0));
  }
  function setOrbFill(control, step) {
    const liquid = control.querySelector(".vol-liquid");
    const level = clampStep(step);
    control.dataset.level = String(level);
    liquid.style.height = `${stepToPct(level)}%`;
  }
  function setTubeVisual(control, step) {
    const tube = control.querySelector(".vol-tube");
    if (!tube) return;
    const track = tube.querySelector(".tube-track");
    const fill = track.querySelector(".tube-fill");
    const handle = track.querySelector(".tube-handle");

    const pct = stepToPct(clampStep(step)); // 0..100
    fill.style.height = `${pct}%`;

    // compute bottom offset for handle center aligned to fill top
    const rectH = track.clientHeight;
    const innerH = rectH - PADS.top - PADS.bottom;
    const heightPx = innerH * (pct / 100);
    const bottomPx = PADS.bottom + heightPx - HANDLE_HALF;
    handle.style.bottom = `${bottomPx}px`;

    track.setAttribute("aria-valuenow", String(pct));
  }

  function updateAllVolumeUI() {
    setOrbFill(volControls.master, masterStep);
    setOrbFill(volControls.lobby, lobbyStep);
    setOrbFill(volControls.instr, instrStep);
    setTubeVisual(volControls.master, masterStep);
    setTubeVisual(volControls.lobby, lobbyStep);
    setTubeVisual(volControls.instr, instrStep);
  }

  function persistSteps() {
    localStorage.setItem("vol_master", String(masterStep));
    localStorage.setItem("vol_lobby", String(lobbyStep));
    localStorage.setItem("vol_instr", String(instrStep));
  }

  // open/close tube above an orb
  let openTubeControl = null;
  let tubeCloseTimer = null;

  function openTube(control) {
    if (openTubeControl && openTubeControl !== control)
      closeTube(openTubeControl);
    const tube = control.querySelector(".vol-tube");
    if (!tube) return;
    tube.hidden = false;
    control.querySelector(".vol-orb").setAttribute("aria-expanded", "true");
    openTubeControl = control;
    clearTimeout(tubeCloseTimer);
    tubeCloseTimer = setTimeout(() => closeTube(control), 5000);
  }
  function closeTube(control) {
    const tube = control.querySelector(".vol-tube");
    if (!tube) return;
    tube.hidden = true;
    control.querySelector(".vol-orb").setAttribute("aria-expanded", "false");
    if (openTubeControl === control) openTubeControl = null;
    clearTimeout(tubeCloseTimer);
    tubeCloseTimer = null;
  }
  function closeAnyTube() {
    if (openTubeControl) closeTube(openTubeControl);
  }

  function attachVolumeHandlers() {
    Object.values(volControls).forEach((control) => {
      const orb = control.querySelector(".vol-orb");
      const tube = control.querySelector(".vol-tube");
      const track = tube.querySelector(".tube-track");

      orb.addEventListener("click", (e) => {
        e.stopPropagation();
        if (tube.hidden) openTube(control);
        else closeTube(control);
      });

      function setStepFromClientY(clientY) {
        const rect = track.getBoundingClientRect();
        const innerTop = rect.top + PADS.top;
        const innerBottom = rect.bottom - PADS.bottom;
        const y = clamp(clientY, innerTop, innerBottom);
        const t = 1 - (y - innerTop) / (innerBottom - innerTop); // 0 bottom .. 1 top
        const step = clampStep(Math.round(t * 4));
        const kind = control.dataset.kind;
        if (kind === "master") masterStep = step;
        else if (kind === "lobby") lobbyStep = step;
        else instrStep = step;

        setOrbFill(control, step);
        setTubeVisual(control, step);
        persistSteps();
        applyGains();
      }

      let dragging = false;
      track.addEventListener("mousedown", (e) => {
        dragging = true;
        setStepFromClientY(e.clientY);
        e.preventDefault();
      });
      window.addEventListener("mousemove", (e) => {
        if (dragging) {
          setStepFromClientY(e.clientY);
          clearTimeout(tubeCloseTimer);
        }
      });
      window.addEventListener("mouseup", () => {
        if (dragging) {
          dragging = false;
          tubeCloseTimer = setTimeout(() => closeTube(control), 1500);
        }
      });

      track.addEventListener("click", (e) => {
        setStepFromClientY(e.clientY);
      });

      track.addEventListener("keydown", (e) => {
        const kind = control.dataset.kind;
        let step =
          kind === "master"
            ? masterStep
            : kind === "lobby"
            ? lobbyStep
            : instrStep;
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          step = clampStep(step + 1);
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          step = clampStep(step - 1);
        } else if (e.key === "Home") {
          step = 0;
        } else if (e.key === "End") {
          step = 4;
        } else if (e.key === "Escape") {
          closeTube(control);
          return;
        } else {
          return;
        }
        e.preventDefault();
        if (kind === "master") masterStep = step;
        else if (kind === "lobby") lobbyStep = step;
        else instrStep = step;
        setOrbFill(control, step);
        setTubeVisual(control, step);
        persistSteps();
        applyGains();
        clearTimeout(tubeCloseTimer);
        tubeCloseTimer = setTimeout(() => closeTube(control), 1500);
      });
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!volCluster.contains(e.target)) closeAnyTube();
    });
  }

  /* ---------- Modal + instrument audio ---------- */
  let lastFocused = null;
  function openModal(id) {
    const data = INSTRUMENTS.find((i) => i.id === id);
    if (!data) return;
    lastFocused = document.activeElement;

    modalTitle.textContent = data.name;
    metaRegion.textContent = data.region || "—";
    metaMaterials.textContent = data.materials || "—";
    metaPron.textContent = data.pronunciation || "—";
    metaDate.textContent = data.date || "—";
    modalDesc.textContent = data.description || "—";
    modalImage.src = `images/${data.id}2.png`;
    modalImage.alt = data.name;

    stopLobby(); // duck lobby while popup is open

    player.pause();
    player.src = "";
    if (data.tracks && data.tracks.length) {
      player.src = pick(data.tracks);
      fadeTo(player, instrGain, currentInstrTarget(), FADE.INSTR_IN_MS).catch(
        () => {}
      );
    }

    modal.hidden = false;
    modalClose.focus();
    document.addEventListener("keydown", onKey);
  }
  function closeModal() {
    document.removeEventListener("keydown", onKey);
    modal.hidden = true;
    fadeOut(player, instrGain, FADE.INSTR_OUT_MS, /*reset=*/ true);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    if (!isMuted && noticeDismissed) startLobby();
  }
  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }

  /* ---------- Events ---------- */
  stage.addEventListener("click", (e) => {
    const b = e.target.closest(".bubble");
    if (!b) return;
    openModal(b.dataset.id);
  });
  modal.addEventListener("click", (e) => {
    if (
      e.target === modal ||
      e.target === modalClose ||
      e.target.dataset.close === "true"
    )
      closeModal();
  });

  // Mute toggle: drop master to 0 visually; restore on unmute
  muteToggle?.addEventListener("click", async () => {
    isMuted = !isMuted;
    localStorage.setItem("prefMuted", isMuted ? "1" : "0");
    muteToggle.setAttribute("aria-pressed", String(isMuted));
    muteToggle.textContent = isMuted ? "🔇 Muted" : "🔈 Sound";

    if (isMuted) {
      prevMasterStep = masterStep;
      masterStep = 0;
      setOrbFill(volControls.master, 0);
      setTubeVisual(volControls.master, 0);
    } else {
      masterStep = prevMasterStep ?? 4;
      setOrbFill(volControls.master, masterStep);
      setTubeVisual(volControls.master, masterStep);
    }
    persistSteps();
    await applyGains();

    if (!isMuted && noticeDismissed && modal.hidden) startLobby();
    if (isMuted) stopLobby();
  });

  helpToggle?.addEventListener("click", () => {
    const exp = helpToggle.getAttribute("aria-expanded") === "true";
    helpToggle.setAttribute("aria-expanded", String(!exp));
    helpPanel.hidden = exp;
  });

  window.addEventListener("resize", () => {
    const { w: W, h: H } = stageSize();
    bubbles.forEach((b) => {
      const s = 1 + b.amp * 0.5,
        half = (b.w * s) / 2;
      b.cx = clamp(b.cx, PHYS.EDGE_PAD + half, W - PHYS.EDGE_PAD - half);
      b.cy = clamp(b.cy, PHYS.EDGE_PAD + half, H - PHYS.EDGE_PAD - half);
    });
  });

  /* ---------- Boot ---------- */
  window.addEventListener("load", async () => {
    // reflect mute state
    muteToggle.setAttribute("aria-pressed", String(isMuted));
    muteToggle.textContent = isMuted ? "🔇 Muted" : "🔈 Sound";

    // Initialize volume UI
    updateAllVolumeUI();
    attachVolumeHandlers();
    await applyGains();

    if (localStorage.getItem("audioNoticeDismissed") === "1") {
      noticeDismissed = true;
      if (!isMuted) startLobby();
    } else {
      audioNotice.hidden = false;

      // ACCEPT → start lobby immediately at current level
      audioNoticeOk?.addEventListener("click", async () => {
        if (audioNoticeDont?.checked)
          localStorage.setItem("audioNoticeDismissed", "1");
        audioNotice.hidden = true;
        noticeDismissed = true;
        if (!isMuted) await startLobbyImmediate();
      });

      // START MUTED
      audioNoticeMute?.addEventListener("click", async () => {
        isMuted = true;
        localStorage.setItem("prefMuted", "1");
        muteToggle.setAttribute("aria-pressed", "true");
        muteToggle.textContent = "🔇 Muted";
        if (audioNoticeDont?.checked)
          localStorage.setItem("audioNoticeDismissed", "1");
        audioNotice.hidden = true;
        noticeDismissed = true;
      });
    }

    initBubbles();
    requestAnimationFrame((t) => {
      last = t;
      animate(t);
    });
  });
})();
