/* =========================================
   main.js — Draggable Bubbles + Modal + Audio
   Two volume orbs (Master + Bubbles) with direct drag
   - Drag bubbles with inertia & collisions
   - Speed caps + damping + post-wall slowdown
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
  const audioNoticeOk = document.getElementById("audioNoticeOk");
  const audioNoticeMute = document.getElementById("audioNoticeMute");
  const audioNoticeDont = document.getElementById("audioNoticeDont");

  // Header / help
  const appHeader = document.querySelector(".app-header");
  const muteToggle = document.getElementById("muteToggle");
  const helpToggle = document.getElementById("helpToggle");
  const helpPanel = document.getElementById("helpPanel");

  // Volume cluster (two orbs)
  const volCluster = document.querySelector(".volume-cluster");
  const volControls = {
    master: document.querySelector('.vol-control[data-kind="master"]'),
    instr: document.querySelector('.vol-control[data-kind="instrument"]'),
  };

  // Audio elements
  const player = document.getElementById("player"); // instrument clips
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

  // Drag + speed guardrails
  const DRAG = {
    THRESHOLD_PX: 10, // movement before a press becomes a drag
    V_MAX: 420, // px/s absolute speed cap
    AIR_DRAG: 0.985, // constant air friction per frame
    WALL_DAMP: 0.86, // energy lost on wall bounce
    COLL_DAMP: 0.94, // energy lost on bubble-bubble collision
    POST_WALL_CAP: 0.75, // after a wall hit, clamp to 75% V_MAX
    SAMPLE_MS: 120, // time window for velocity estimation
  };

  const FADE = {
    INSTR_IN_MS: 900,
    INSTR_OUT_MS: 220,
  };

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
  const rectOf = (el) =>
    el?.getBoundingClientRect?.() ?? {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
    };

  const stageSize = () => {
    const r = stage.getBoundingClientRect();
    return {
      w: r.width || innerWidth || 1024,
      h: r.height || innerHeight || 768,
    };
  };

  function hypot(x, y) {
    return Math.hypot(x, y);
  }
  function clampSpeed(vx, vy, cap) {
    const s = hypot(vx, vy);
    if (s <= cap || s === 0) return { vx, vy };
    const k = cap / s;
    return { vx: vx * k, vy: vy * k };
  }

  /* ---------- “No-fly zones” (keep bubbles away from UI) ---------- */
  function getNoFlyRects() {
    const header = rectOf(appHeader);
    const help = !helpPanel.hidden ? rectOf(helpPanel) : null;
    const vol = rectOf(volCluster);
    const pad = 10;
    const inflate = (r) =>
      r
        ? {
            left: r.left - pad,
            top: r.top - pad,
            right: r.right + pad,
            bottom: r.bottom + pad,
          }
        : null;
    return [inflate(header), inflate(help), inflate(vol)].filter(Boolean);
  }
  function pointInRect(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  /* ---------- Bubbles ---------- */
  // Each bubble struct:
  // { el,w,h,cx,cy,vx,vy,amp,omega,phase,swaySeed, dragging, dragDX, dragDY, samples:[{t,x,y}], zBase }
  const bubbles = [];

  function initBubbles() {
    const nodes = [...stage.querySelectorAll(".bubble")];
    const { w: W, h: H } = stageSize();
    const nofly = getNoFlyRects();

    nodes.forEach((el) => {
      const size = Math.round(rand(PHYS.SIZE_MIN, PHYS.SIZE_MAX));
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;

      // Spawn away from UI
      let cx,
        cy,
        tries = 0;
      while (true) {
        tries++;
        cx = rand(PHYS.EDGE_PAD + size / 2, W - (PHYS.EDGE_PAD + size / 2));
        cy = rand(PHYS.EDGE_PAD + size / 2, H - (PHYS.EDGE_PAD + size / 2));
        const inside = nofly.some((r) => pointInRect(cx, cy, r));
        if (!inside || tries > 40) break;
      }

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

      // pointer interaction setup
      const zBase = parseInt(getComputedStyle(el).zIndex || "0", 10) || 0;
      const b = {
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
        dragging: false,
        dragDX: 0,
        dragDY: 0,
        samples: [],
        zBase,
      };
      attachBubbleDrag(b);
      bubbles.push(b);
    });
  }

  /* ---------- Drag & inertia on bubbles ---------- */
  let gestureWasDrag = false; // suppress modal if true for this pointer up

  function attachBubbleDrag(b) {
    const el = b.el;

    const getPointerPos = (e) => ({
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
    });

    let start = null;
    let lastPos = null;

    const onPointerDown = (e) => {
      if (!modal.hidden) return; // disable while reading
      el.setPointerCapture?.(e.pointerId);
      start = getPointerPos(e);
      lastPos = start;
      b.dragging = false; // not yet — wait for threshold
      b.samples.length = 0;
      b.samples.push(start);
      gestureWasDrag = false;

      // bring to front & add held style
      el.style.zIndex = String(1000);
      el.classList.add("is-active");
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!start) return;
      const p = getPointerPos(e);
      const dx = p.x - start.x;
      const dy = p.y - start.y;

      // become a drag after threshold
      if (!b.dragging && Math.hypot(dx, dy) > DRAG.THRESHOLD_PX) {
        b.dragging = true;
        gestureWasDrag = true;
      }

      if (b.dragging) {
        const { w: W, h: H } = stageSize();
        const scale = 1 + b.amp * Math.sin(b.phase);
        const half = (b.w * scale) / 2;

        // target center follows pointer
        let tx = b.cx + (p.x - lastPos.x);
        let ty = b.cy + (p.y - lastPos.y);

        // keep inside stage bounds
        tx = clamp(tx, PHYS.EDGE_PAD + half, W - PHYS.EDGE_PAD - half);
        ty = clamp(ty, PHYS.EDGE_PAD + half, H - PHYS.EDGE_PAD - half);

        // avoid no-fly rects: if pointer center falls in a rect, gently push out
        const nofly = getNoFlyRects();
        for (const r of nofly) {
          if (pointInRect(tx, ty, r)) {
            const dxLeft = Math.abs(tx - r.left);
            const dxRight = Math.abs(r.right - tx);
            const dyTop = Math.abs(ty - r.top);
            const dyBottom = Math.abs(r.bottom - ty);
            const minD = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minD === dxLeft) tx = r.left - half;
            else if (minD === dxRight) tx = r.right + half;
            else if (minD === dyTop) ty = r.top - half;
            else ty = r.bottom + half;
          }
        }

        // set new center
        b.cx = tx;
        b.cy = ty;

        // collect samples for velocity estimate
        b.samples.push(p);
        // keep only last SAMPLE_MS window
        const cutoff = p.t - DRAG.SAMPLE_MS;
        while (b.samples.length && b.samples[0].t < cutoff) b.samples.shift();

        // live paint while dragging
        const s = scale;
        const sx = 0,
          sy = 0; // disable sway while held for precision
        const x = b.cx - b.w / 2 + sx;
        const y = b.cy - b.h / 2 + sy;
        el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      }

      lastPos = p;
    };

    const onPointerUp = (e) => {
      if (!start) return;
      const end = getPointerPos(e);

      if (b.dragging) {
        // estimate velocity from last samples
        const a = b.samples[0] || end;
        const dt = Math.max(0.001, (end.t - a.t) / 1000);
        let vx = (end.x - a.x) / dt;
        let vy = (end.y - a.y) / dt;

        // clamp to V_MAX
        ({ vx, vy } = clampSpeed(vx, vy, DRAG.V_MAX));

        b.vx = vx;
        b.vy = vy;
      }

      // cleanup
      b.dragging = false;
      b.samples.length = 0;
      start = null;
      lastPos = null;

      // restore z-index & style
      el.style.zIndex = String(b.zBase);
      el.classList.remove("is-active");
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // Pair collisions — throttled every other frame for perf
  let collideToggle = false;
  function collidePairs() {
    collideToggle = !collideToggle;
    if (!collideToggle) return;
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i],
          b = bubbles[j];

        // Skip if either being dragged (let finger win)
        if (a.dragging || b.dragging) continue;

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
            ny = dy / dist;
          const overlap = (minDist - dist) / 2;

          a.cx -= nx * overlap;
          a.cy -= ny * overlap;
          b.cx += nx * overlap;
          b.cy += ny * overlap;

          const avn = a.vx * nx + a.vy * ny;
          const bvn = b.vx * nx + b.vy * ny;
          const atx = a.vx - avn * nx,
            aty = a.vy - avn * ny;
          const btx = b.vx - bvn * nx,
            bty = b.vy - bvn * ny;

          a.vx = atx + bvn * nx;
          a.vy = aty + bvn * ny;
          b.vx = btx + avn * nx;
          b.vy = bty + avn * ny;

          // jitter + collision damping
          const j = PHYS.BOUNCE_JITTER;
          a.vx = a.vx * DRAG.COLL_DAMP * (1 + (Math.random() - 0.5) * j);
          a.vy = a.vy * DRAG.COLL_DAMP * (1 + (Math.random() - 0.5) * j);
          b.vx = b.vx * DRAG.COLL_DAMP * (1 + (Math.random() - 0.5) * j);
          b.vy = b.vy * DRAG.COLL_DAMP * (1 + (Math.random() - 0.5) * j);

          // cap to V_MAX
          ({ vx: a.vx, vy: a.vy } = clampSpeed(a.vx, a.vy, DRAG.V_MAX));
          ({ vx: b.vx, vy: b.vy } = clampSpeed(b.vx, b.vy, DRAG.V_MAX));
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
    const nofly = getNoFlyRects();

    for (const b of bubbles) {
      // breathing
      b.phase += b.omega * dt;
      const s = 1 + b.amp * Math.sin(b.phase);
      const half = (b.w * s) / 2;

      if (!b.dragging) {
        // constant air drag
        b.vx *= DRAG.AIR_DRAG;
        b.vy *= DRAG.AIR_DRAG;

        // advance
        b.cx += b.vx * dt;
        b.cy += b.vy * dt;

        // walls
        let hitWall = false;
        if (b.cx - half <= PHYS.EDGE_PAD) {
          b.cx = PHYS.EDGE_PAD + half;
          b.vx = Math.abs(b.vx) * DRAG.WALL_DAMP;
          hitWall = true;
        }
        if (b.cx + half >= W - PHYS.EDGE_PAD) {
          b.cx = W - PHYS.EDGE_PAD - half;
          b.vx = -Math.abs(b.vx) * DRAG.WALL_DAMP;
          hitWall = true;
        }
        if (b.cy - half <= PHYS.EDGE_PAD) {
          b.cy = PHYS.EDGE_PAD + half;
          b.vy = Math.abs(b.vy) * DRAG.WALL_DAMP;
          hitWall = true;
        }
        if (b.cy + half >= H - PHYS.EDGE_PAD) {
          b.cy = H - PHYS.EDGE_PAD - half;
          b.vy = -Math.abs(b.vy) * DRAG.WALL_DAMP;
          hitWall = true;
        }
        // no-fly push-out (if center falls into rect, nudge out)
        for (const r of nofly) {
          if (pointInRect(b.cx, b.cy, r)) {
            const dxLeft = Math.abs(b.cx - r.left);
            const dxRight = Math.abs(r.right - b.cx);
            const dyTop = Math.abs(b.cy - r.top);
            const dyBottom = Math.abs(r.bottom - b.cy);
            const minD = Math.min(dxLeft, dxRight, dyTop, dyBottom);
            if (minD === dxLeft) {
              b.cx = r.left - half;
              b.vx = -Math.abs(b.vx) * DRAG.WALL_DAMP;
              hitWall = true;
            } else if (minD === dxRight) {
              b.cx = r.right + half;
              b.vx = Math.abs(b.vx) * DRAG.WALL_DAMP;
              hitWall = true;
            } else if (minD === dyTop) {
              b.cy = r.top - half;
              b.vy = -Math.abs(b.vy) * DRAG.WALL_DAMP;
              hitWall = true;
            } else {
              b.cy = r.bottom + half;
              b.vy = Math.abs(b.vy) * DRAG.WALL_DAMP;
              hitWall = true;
            }
          }
        }
        // after wall, clamp a bit tighter to calm down quickly
        if (hitWall) {
          ({ vx: b.vx, vy: b.vy } = clampSpeed(
            b.vx,
            b.vy,
            DRAG.V_MAX * DRAG.POST_WALL_CAP
          ));
        }

        // global hard cap
        ({ vx: b.vx, vy: b.vy } = clampSpeed(b.vx, b.vy, DRAG.V_MAX));
      }

      // render (sway during free flight; none while held)
      const swayX = b.dragging
        ? 0
        : Math.sin(now / 900 + b.swaySeed) * PHYS.SWAY_X;
      const swayY = b.dragging
        ? 0
        : Math.cos(now / 1100 + b.swaySeed) * PHYS.SWAY_Y;
      const x = b.cx - b.w / 2 + swayX;
      const y = b.cy - b.h / 2 + swayY;
      b.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      b.el.style.transformOrigin = "center center";
    }

    collidePairs();
    requestAnimationFrame(animate);
  }

  /* ---------- Audio plumbing (Master + Bubbles only) ---------- */
  let audioCtx, instrGain, masterGain, instrSrc;
  let isMuted = localStorage.getItem("prefMuted") === "1";
  let noticeDismissed = localStorage.getItem("audioNoticeDismissed") === "1";

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
      instrGain.gain.value = 1;
      instrGain.connect(masterGain);
    }
    if (!instrSrc) {
      instrSrc = audioCtx.createMediaElementSource(player);
      instrSrc.connect(instrGain);
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
      if (reset) elem.currentTime = 0;
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

  /* ---------- Volume state (0..100 %) ---------- */
  let masterPct = parseInt(localStorage.getItem("vol_master_pct") ?? "100", 10);
  let instrPct = parseInt(localStorage.getItem("vol_instr_pct") ?? "100", 10);
  masterPct = clamp(masterPct, 0, 100);
  instrPct = clamp(instrPct, 0, 100);
  let prevMasterPct = masterPct;

  const pctToUnit = (p) => clamp(p, 0, 100) / 100;

  function persistVolume() {
    localStorage.setItem("vol_master_pct", String(masterPct));
    localStorage.setItem("vol_instr_pct", String(instrPct));
  }

  function updateOrbVisual(control, pct) {
    const liquid = control.querySelector(".vol-liquid");
    control.dataset.level = String(pct); // for CSS filters if desired
    if (liquid) liquid.style.height = `${pct}%`;
  }

  function updateAllVolumeUI() {
    updateOrbVisual(volControls.master, masterPct);
    updateOrbVisual(volControls.instr, instrPct);
  }

  async function applyGainsImmediate() {
    ensureAudio();
    const t = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    instrGain.gain.cancelScheduledValues(t);
    const m = isMuted ? 0 : pctToUnit(masterPct);
    masterGain.gain.setValueAtTime(m, t);
    instrGain.gain.setValueAtTime(pctToUnit(instrPct), t);
  }

  /* ---------- Orb interaction (drag, wheel, keyboard) ---------- */
  function attachOrb(control, kind) {
    const orb = control.querySelector(".vol-orb");

    const getPct = () => (kind === "master" ? masterPct : instrPct);
    const setPct = (v) => {
      const p = clamp(Math.round(v), 0, 100);
      if (kind === "master") masterPct = p;
      else instrPct = p;
      updateOrbVisual(control, p);
      persistVolume();
      applyGainsImmediate();
    };

    function clientYtoPct(clientY) {
      const r = orb.getBoundingClientRect();
      const innerTop = r.top,
        innerBottom = r.bottom;
      const y = clamp(clientY, innerTop, innerBottom);
      const t = 1 - (y - innerTop) / (innerBottom - innerTop);
      return t * 100;
    }

    // Pointer drag on orb (for volume)
    let dragging = false;
    const onPointerDown = (e) => {
      dragging = true;
      orb.classList.add("is-active");
      orb.setPointerCapture?.(e.pointerId);
      setPct(clientYtoPct(e.clientY));
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      setPct(clientYtoPct(e.clientY));
    };
    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      orb.classList.remove("is-active");
      orb.releasePointerCapture?.(e.pointerId);
    };

    orb.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Click to set
    orb.addEventListener("click", (e) => setPct(clientYtoPct(e.clientY)));

    // Wheel / trackpad
    orb.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 5;
        const delta = e.deltaY > 0 ? -step : step;
        setPct(getPct() + delta);
      },
      { passive: false }
    );

    // Keyboard
    orb.setAttribute("tabindex", "0");
    orb.addEventListener("keydown", (e) => {
      let p = getPct();
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        p += 5;
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        p -= 5;
      } else if (e.key === "Home") {
        p = 0;
      } else if (e.key === "End") {
        p = 100;
      } else if (e.key === "PageUp") {
        p += 10;
      } else if (e.key === "PageDown") {
        p -= 10;
      } else if (e.key === "Escape") {
        orb.blur();
        return;
      } else {
        return;
      }
      e.preventDefault();
      setPct(p);
    });

    updateOrbVisual(control, getPct());
    orb.addEventListener("mouseenter", () => orb.classList.add("is-hover"));
    orb.addEventListener("mouseleave", () => orb.classList.remove("is-hover"));
  }

  /* ---------- Modal + instrument audio ---------- */
  let lastFocused = null;

  function trapFocus(container) {
    const focusables = container.querySelectorAll(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    function onKey(e) {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    container.addEventListener("keydown", onKey);
    return () => container.removeEventListener("keydown", onKey);
  }
  let untrap = null;

  function setAppInert(state) {
    stage.setAttribute("aria-hidden", state ? "true" : "false");
    appHeader.setAttribute("aria-hidden", state ? "true" : "false");
    volCluster.setAttribute("aria-hidden", state ? "true" : "false");
  }

  function currentInstrTarget() {
    return pctToUnit(instrPct); // master is a parent node
  }

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

    // Play instrument clip if available
    player.pause();
    player.src = "";
    if (data.tracks && data.tracks.length) {
      player.src = pick(data.tracks);
      fadeTo(player, instrGain, currentInstrTarget(), FADE.INSTR_IN_MS).catch(
        () => {}
      );
    }

    modal.hidden = false;
    setAppInert(true);
    untrap = trapFocus(modal);
    modalClose.focus();

    document.addEventListener("keydown", onKey);
  }
  function closeModal() {
    document.removeEventListener("keydown", onKey);
    modal.hidden = true;
    if (untrap) {
      untrap();
      untrap = null;
    }
    setAppInert(false);
    fadeOut(player, instrGain, FADE.INSTR_OUT_MS, /*reset=*/ true);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }

  /* ---------- Events ---------- */
  // Click → open modal unless last gesture was a drag (suppresses accidental open)
  stage.addEventListener("click", (e) => {
    if (gestureWasDrag) {
      gestureWasDrag = false;
      return;
    }
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

  // Mute toggle
  muteToggle?.addEventListener("click", async () => {
    isMuted = !isMuted;
    localStorage.setItem("prefMuted", isMuted ? "1" : "0");
    muteToggle.setAttribute("aria-pressed", String(isMuted));
    muteToggle.textContent = isMuted ? "🔇 Muted" : "🔈 Sound";

    if (isMuted) {
      const prev = masterPct;
      localStorage.setItem("vol_master_prev", String(prev));
      masterPct = 0;
      updateOrbVisual(volControls.master, 0);
    } else {
      const prev = parseInt(
        localStorage.getItem("vol_master_prev") ?? "100",
        10
      );
      masterPct = clamp(prev, 0, 100);
      updateOrbVisual(volControls.master, masterPct);
    }
    persistVolume();
    await applyGainsImmediate();
  });

  helpToggle?.addEventListener("click", () => {
    const exp = helpToggle.getAttribute("aria-expanded") === "true";
    helpToggle.setAttribute("aria-expanded", String(!exp));
    helpPanel.hidden = exp;
  });

  window.addEventListener("resize", () => {
    const { w: W, h: H } = stageSize();
    bubbles.forEach((b) => {
      const s = 1 + b.amp * Math.sin(b.phase);
      const half = (b.w * s) / 2;
      b.cx = clamp(b.cx, PHYS.EDGE_PAD + half, W - PHYS.EDGE_PAD - half);
      b.cy = clamp(b.cy, PHYS.EDGE_PAD + half, H - PHYS.EDGE_PAD - half);
    });
  });

  /* ---------- Boot ---------- */
  window.addEventListener("load", async () => {
    // Reflect mute state
    muteToggle.setAttribute("aria-pressed", String(isMuted));
    muteToggle.textContent = isMuted ? "🔇 Muted" : "🔈 Sound";

    // Audio graph ready
    await applyGainsImmediate();

    // Orb handlers
    attachOrb(volControls.master, "master");
    attachOrb(volControls.instr, "instrument");

    // Audio notice
    if (localStorage.getItem("audioNoticeDismissed") === "1") {
      noticeDismissed = true;
    } else {
      audioNotice.hidden = false;

      audioNoticeOk?.addEventListener("click", async () => {
        if (audioNoticeDont?.checked)
          localStorage.setItem("audioNoticeDismissed", "1");
        audioNotice.hidden = true;
        noticeDismissed = true;
      });

      audioNoticeMute?.addEventListener("click", async () => {
        isMuted = true;
        localStorage.setItem("prefMuted", "1");
        muteToggle.setAttribute("aria-pressed", "true");
        muteToggle.textContent = "🔇 Muted";
        if (audioNoticeDont?.checked)
          localStorage.setItem("audioNoticeDismissed", "1");
        audioNotice.hidden = true;
        noticeDismissed = true;
        await applyGainsImmediate();
      });
    }

    // Bubbles
    initBubbles();
    requestAnimationFrame((t) => {
      last = t;
      animate(t);
    });
  });
})();
