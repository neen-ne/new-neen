(() => {
  const canvas = document.querySelector("[data-island-canvas]");
  const statusNode = document.querySelector("[data-status]");
  const zoneNode = document.querySelector("[data-zone-name]");
  const minimap = document.querySelector(".sunny-minimap");
  const mapToggle = document.querySelector("[data-map-toggle]");
  const codexDialog = document.querySelector("[data-codex-dialog]");
  const codexGrid = document.querySelector("[data-codex-grid]");
  const objectivesNode = document.querySelector("[data-objectives]");
  const startButton = document.querySelector("[data-adventure-start]");
  const completeButton = document.querySelector("[data-adventure-complete]");
  const avatarSelect = document.querySelector("[data-avatar-select]");
  const avatarPortrait = document.querySelector("[data-avatar-portrait]");
  const actionButton = document.querySelector("[data-action-button]");
  const touchActionButton = document.querySelector("[data-touch-action]");
  const jumpButton = document.querySelector("[data-jump-button]");
  const dashButton = document.querySelector("[data-dash-button]");
  const joystick = document.querySelector("[data-joystick]");
  const joystickKnob = document.querySelector("[data-joystick-knob]");
  if (
    !(canvas instanceof HTMLCanvasElement)
    || !(statusNode instanceof HTMLElement)
    || !(zoneNode instanceof HTMLElement)
    || !(minimap instanceof HTMLElement)
    || !(mapToggle instanceof HTMLButtonElement)
    || !(codexDialog instanceof HTMLDialogElement)
    || !(codexGrid instanceof HTMLElement)
    || !(objectivesNode instanceof HTMLElement)
    || !(startButton instanceof HTMLButtonElement)
    || !(completeButton instanceof HTMLButtonElement)
  ) return;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    statusNode.textContent = "Your browser could not start the island canvas.";
    statusNode.classList.add("is-error");
    return;
  }

  const WORLD = { width: 1600, height: 1000, viewWidth: 1000, viewHeight: 620 };
  const ZONES = {
    neon_pier: "Moonlit Stilt Bay",
    palm_grove: "Crownleaf Manor",
    loot_canyon: "Skycrate Foundry",
    sunset_ridge: "Solstice Bellspire",
  };
  const PORTALS = {
    neon_pier: [{ x: 1490, y: 520, zone: "palm_grove", label: "Follow the boardwalk to Crownleaf Manor" }],
    palm_grove: [
      { x: 85, y: 520, zone: "neon_pier", label: "Return to Moonlit Stilt Bay" },
      { x: 1510, y: 510, zone: "loot_canyon", label: "Take the foundry road" },
    ],
    loot_canyon: [
      { x: 85, y: 510, zone: "palm_grove", label: "Return to Crownleaf Manor" },
      { x: 1510, y: 500, zone: "sunset_ridge", label: "Climb to Solstice Bellspire" },
    ],
    sunset_ridge: [{ x: 85, y: 500, zone: "loot_canyon", label: "Descend to Skycrate Foundry" }],
  };
  const PICKUPS = [
    { id: "snoop_badge", zone: "neon_pier", x: 390, y: 690, label: "Snoop Badge" },
    { id: "golden_compass", zone: "loot_canyon", x: 945, y: 515, label: "Golden Compass" },
    { id: "neon_relic", zone: "loot_canyon", x: 475, y: 715, label: "Neon Relic" },
    { id: "drift_token", zone: "sunset_ridge", x: 560, y: 700, label: "Drift Token" },
    { id: "sun_crate", zone: "palm_grove", x: 385, y: 690, label: "Sun Crate" },
    { id: "palm_pack", zone: "palm_grove", x: 895, y: 430, label: "Palm Pack" },
    { id: "reef_sticker", zone: "palm_grove", x: 1215, y: 700, label: "Reef Sticker" },
    { id: "sunset_sticker", zone: "neon_pier", x: 755, y: 340, label: "Sunset Sticker" },
    { id: "canyon_sticker", zone: "sunset_ridge", x: 1165, y: 720, label: "Canyon Sticker" },
  ];
  const AVATAR_LOOKS = [
    { id: "snoop-sticker-01", name: "Moonlit Blue", jacket: "#18294c", sleeve: "#2787c5", accent: "#80f8ff", trim: "#e5bf61" },
    { id: "snoop-sticker-02", name: "Rose Pulse", jacket: "#302345", sleeve: "#bd58a2", accent: "#ff9bda", trim: "#f2d486" },
    { id: "snoop-sticker-03", name: "Starflare", jacket: "#24304d", sleeve: "#3b86df", accent: "#b7e5ff", trim: "#e9b957" },
    { id: "snoop-sticker-04", name: "Crown Gold", jacket: "#29334b", sleeve: "#c77a35", accent: "#ffd87a", trim: "#f8e9ba" },
    { id: "snoop-sticker-05", name: "Neon Violet", jacket: "#241f42", sleeve: "#7658d6", accent: "#d4adff", trim: "#f3cc68" },
    { id: "snoop-sticker-06", name: "Glacier", jacket: "#193b4a", sleeve: "#2f98a9", accent: "#9ef6ff", trim: "#e7c56e" },
    { id: "snoop-sticker-07", name: "Sakura", jacket: "#30253f", sleeve: "#d2678f", accent: "#ffc1db", trim: "#f5d276" },
    { id: "snoop-sticker-08", name: "Victory Mint", jacket: "#1d384b", sleeve: "#25a98d", accent: "#8df3d5", trim: "#eec55f" },
    { id: "snoop-sticker-09", name: "Sunset Ember", jacket: "#3a293d", sleeve: "#df704f", accent: "#ffc078", trim: "#f3d16c" },
  ];
  const AVATAR_STORAGE_KEY = "neen_sunny_avatar";
  const readSavedAvatar = () => {
    try {
      const saved = window.localStorage.getItem(AVATAR_STORAGE_KEY);
      return AVATAR_LOOKS.some((avatar) => avatar.id === saved)
        ? saved
        : AVATAR_LOOKS[0].id;
    } catch {
      return AVATAR_LOOKS[0].id;
    }
  };
  const AMBIENT_ART = Array.from({ length: 5 }, (_, index) => ({
    zone: ["neon_pier", "palm_grove", "loot_canyon", "sunset_ridge", "palm_grove"][index],
    x: [1140, 650, 1290, 930, 1350][index],
    y: [715, 285, 340, 300, 290][index],
    imageId: `snoop-sticker-${String(index + 5).padStart(2, "0")}`,
  }));
  const BEACONS = [
    { id: "pier-beacon-a", zone: "neon_pier", x: 800, y: 440, label: "West Beacon" },
    { id: "pier-beacon-b", zone: "neon_pier", x: 1110, y: 600, label: "East Beacon" },
  ];
  const QUEST_BOARD = { id: "quest-board", zone: "neon_pier", x: 290, y: 530, label: "Daily Adventure Board" };
  const DROP_MARKER = { id: "drop-marker", zone: "palm_grove", x: 350, y: 495, label: "Crownleaf Supply Crates" };
  const BELLSPIRE = { id: "summit-bellspire", zone: "sunset_ridge", x: 1330, y: 390, label: "Solstice Bellspire" };
  const SUPPLY_DROP = { id: "foundry-air-drop", zone: "loot_canyon", x: 1260, y: 735, label: "Timed Foundry Air Drop" };
  const INTERACTION_RADIUS = 74;
  const colors = {
    ink: "#24495a",
    white: "#fffdf1",
    teal: "#52b7bb",
    coral: "#ed8054",
    gold: "#f2c65d",
    green: "#73b87b",
  };
  const state = {
    csrfToken: "",
    busy: false,
    authenticated: false,
    session: null,
    progress: {
      xp: 0,
      level: 1,
      unlocked_collectibles: [],
      discovered_zones: [],
      total_adventures_completed: 0,
      last_position: null,
    },
    codex: [],
    avatarId: readSavedAvatar(),
    adventure: { attempts_remaining_today: 0, free_attempts_per_day: 3, reward_amount_coins: 50 },
    earnedCoins: null,
    position: { zone: "neon_pier", x: 150, y: 520 },
    facing: { x: 1, y: 0 },
    keys: new Set(),
    joystickVector: { x: 0, y: 0 },
    joystickPointer: null,
    images: new Map(),
    particles: [],
    beaconActivations: new Set(),
    activeInteraction: null,
    interactionKey: "",
    dirty: false,
    progressTimer: 0,
    lastPeriodicSync: 0,
    lastFrame: 0,
    jumpUntil: 0,
    dashUntil: 0,
    dashCooldownUntil: 0,
    toastUntil: 0,
    toastMessage: "",
    victoryTimer: 0,
    animationFrame: 0,
    startedAt: performance.now(),
    lastDashHudUpdate: 0,
    floatingTexts: [],
  };

  const api = async (path, method = "GET", data = null) => {
    const headers = { Accept: "application/json" };
    const options = { method, credentials: "same-origin", cache: "no-store", headers };
    if (data !== null) {
      if (!state.csrfToken) {
        const csrfResponse = await fetch("/api/auth/csrf", {
          headers: { Accept: "application/json" },
          credentials: "same-origin",
          cache: "no-store",
        });
        let csrfResult;
        try { csrfResult = await csrfResponse.json(); } catch { throw new Error("The security token could not be read."); }
        if (!csrfResponse.ok || csrfResult.success !== true) {
          throw new Error(csrfResult.errors?.[0]?.message || "A security token is required.");
        }
        state.csrfToken = csrfResult.data.csrf_token;
      }
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = state.csrfToken;
      options.body = JSON.stringify(data);
    }
    const response = await fetch(path, options);
    let result;
    try { result = await response.json(); } catch { throw new Error("The island service returned an unreadable response."); }
    if (!response.ok || result.success !== true) {
      const error = new Error(result.errors?.[0]?.message || "The island request could not be completed.");
      error.code = result.errors?.[0]?.code;
      error.status = response.status;
      throw error;
    }
    return result.data;
  };

  const setStatus = (message, isError = false) => {
    statusNode.textContent = message;
    statusNode.classList.toggle("is-error", isError);
  };

  const setAvatar = (avatarId, persist = false) => {
    const avatar = AVATAR_LOOKS.find((item) => item.id === avatarId);
    if (!avatar) return;
    state.avatarId = avatar.id;
    if (avatarPortrait instanceof HTMLCanvasElement) {
      avatarPortrait.setAttribute("aria-label", `NEEN avatar: ${avatar.name}`);
      drawAvatarPortrait(avatar);
    }
    if (avatarSelect instanceof HTMLSelectElement) avatarSelect.value = avatar.id;
    if (!persist) return;
    try {
      window.localStorage.setItem(AVATAR_STORAGE_KEY, avatar.id);
      setStatus(`${avatar.name} look selected and saved in this browser.`);
    } catch {
      setStatus("Look changed, but your browser could not save this selection.", true);
    }
  };

  const formatNumber = (value) => new Intl.NumberFormat().format(Number(value) || 0);

  const imageFor = (id) => state.images.get(id);

  const loadImages = (catalog) => {
    for (const item of catalog) {
      if (state.images.has(item.id)) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = item.image;
      image.addEventListener("load", () => state.dirty = true, { once: true });
      state.images.set(item.id, image);
    }
    for (const ambient of AMBIENT_ART) {
      if (state.images.has(ambient.imageId)) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = `/assets/hero-loot/${ambient.imageId}.webp`;
      image.addEventListener("load", () => state.dirty = true, { once: true });
      state.images.set(ambient.imageId, image);
    }
  };

  const updateProgress = (progress) => {
    if (!progress) return;
    state.progress = {
      xp: Number(progress.xp) || 0,
      level: Number(progress.level) || 1,
      unlocked_collectibles: Array.isArray(progress.unlocked_collectibles) ? progress.unlocked_collectibles : [],
      discovered_zones: Array.isArray(progress.discovered_zones) ? progress.discovered_zones : [],
      total_adventures_completed: Number(progress.total_adventures_completed) || 0,
      last_position: progress.last_position || null,
    };
    renderProgress();
  };

  const updateSession = (session) => {
    state.session = session || null;
    renderObjectives();
  };

  const renderProgress = () => {
    const level = Math.max(1, state.progress.level);
    const currentLevelXp = state.progress.xp % 300;
    const levelNode = document.querySelector("[data-level]");
    const levelLabel = document.querySelector("[data-level-label]");
    const xpFill = document.querySelector("[data-xp-fill]");
    const xpLabel = document.querySelector("[data-xp-label]");
    const codexCount = document.querySelector("[data-codex-count]");
    if (levelNode) levelNode.textContent = String(level);
    if (levelLabel) levelLabel.textContent = String(level);
    if (xpFill) xpFill.style.width = `${(currentLevelXp / 300) * 100}%`;
    if (xpLabel) xpLabel.textContent = `${formatNumber(currentLevelXp)} / 300 XP`;
    if (codexCount) codexCount.textContent = `${state.progress.unlocked_collectibles.length}/${state.codex.length || 9}`;

    const attempts = document.querySelector("[data-attempts]");
    const rewardNode = document.querySelector("[data-reward]");
    if (attempts) {
      attempts.textContent = `Daily adventures: ${state.adventure.attempts_remaining_today} / ${state.adventure.free_attempts_per_day} left`;
    }
    if (rewardNode) {
      rewardNode.textContent = state.authenticated
        ? formatNumber(state.adventure.reward_amount_coins)
        : "—";
    }
    const balance = document.querySelector("[data-earned-balance]");
    if (balance) balance.textContent = state.earnedCoins === null ? "—" : formatNumber(state.earnedCoins);
    startButton.disabled = !state.authenticated || state.busy
      || state.adventure.attempts_remaining_today < 1
      || Boolean(state.session && ["started", "in_progress"].includes(state.session.status));
    startButton.textContent = state.session && ["started", "in_progress"].includes(state.session.status)
      ? "Adventure in Progress"
      : state.adventure.attempts_remaining_today > 0
        ? "Start Daily Adventure"
        : "Daily Runs Used";
    renderCodex();
    renderObjectives();
  };

  const renderObjectives = () => {
    objectivesNode.replaceChildren();
    const title = document.querySelector("[data-quest-title]");
    const subtitle = document.querySelector("[data-quest-subtitle]");
    if (!state.session || !["started", "in_progress"].includes(state.session.status)) {
      if (title) title.textContent = "Free Roam";
      if (subtitle) subtitle.textContent = "Pick up treasures and explore every zone.";
      const empty = document.createElement("p");
      empty.className = "sunny-empty-objectives";
      empty.textContent = state.authenticated
        ? "Start a daily adventure to reveal your three island objectives."
        : "Sign in to save discoveries and start a daily adventure.";
      objectivesNode.append(empty);
      completeButton.hidden = true;
      return;
    }
    if (title) title.textContent = "Today's Adventure";
    if (subtitle) subtitle.textContent = "Explore the island and finish each server-assigned objective.";
    const objectives = Array.isArray(state.session.objectives) ? state.session.objectives : [];
    for (const objective of objectives) {
      const row = document.createElement("div");
      row.className = `sunny-objective${objective.completed ? " is-complete" : ""}`;
      const check = document.createElement("span");
      check.className = "sunny-objective-check";
      check.textContent = objective.completed ? "✓" : "•";
      const copy = document.createElement("span");
      const titleText = document.createElement("strong");
      titleText.textContent = objective.description || objective.id.replaceAll("_", " ");
      const zoneText = document.createElement("small");
      zoneText.textContent = ZONES[objective.zone] || objective.zone;
      copy.append(titleText, zoneText);
      row.append(check, copy);
      objectivesNode.append(row);
    }
    const complete = objectives.length > 0 && objectives.every((objective) => objective.completed);
    completeButton.hidden = !complete;
    completeButton.disabled = state.busy || !complete;
  };

  const renderCodex = () => {
    codexGrid.replaceChildren();
    const found = new Set(state.progress.unlocked_collectibles);
    for (const collectible of state.codex) {
      const item = document.createElement("article");
      const isFound = found.has(collectible.id);
      item.className = `sunny-codex-item ${isFound ? "is-found" : "is-locked"}`;
      const art = document.createElement("div");
      art.className = "sunny-codex-art";
      const image = document.createElement("img");
      image.src = collectible.image;
      image.alt = isFound ? collectible.name : "Undiscovered island collectible";
      image.loading = "lazy";
      art.append(image);
      const title = document.createElement("strong");
      title.textContent = collectible.name;
      const label = document.createElement("small");
      label.textContent = isFound ? "Discovered" : "Not found yet";
      item.append(art, title, label);
      codexGrid.append(item);
    }
    const summary = document.querySelector("[data-codex-summary]");
    if (summary) {
      summary.textContent = `${found.size} of ${state.codex.length} keepsakes discovered. Your finds are saved to your account.`;
    }
  };

  const renderMap = () => {
    document.querySelectorAll("[data-map-zone]").forEach((node) => {
      const zone = node.getAttribute("data-map-zone");
      node.classList.toggle("is-current", zone === state.position.zone);
      node.classList.toggle("is-discovered", state.progress.discovered_zones.includes(zone));
    });
    const current = ZONES[state.position.zone] || "Sunny Island";
    const miniLabel = document.querySelector("[data-minimap-coords]");
    if (miniLabel) miniLabel.textContent = current.toUpperCase();
    zoneNode.textContent = current;
    const point = {
      neon_pier: [37, 92],
      palm_grove: [108, 38],
      loot_canyon: [179, 103],
      sunset_ridge: [183, 24],
    }[state.position.zone] || [37, 92];
    const marker = document.querySelector("[data-map-player]");
    if (marker) {
      marker.setAttribute("cx", String(point[0]));
      marker.setAttribute("cy", String(point[1]));
    }
  };

  const toast = (message, duration = 2400) => {
    const node = document.querySelector("[data-toast]");
    if (!(node instanceof HTMLElement)) return;
    state.toastMessage = message;
    state.toastUntil = performance.now() + duration;
    node.textContent = message;
    node.hidden = false;
  };

  const celebrateVictory = () => {
    const banner = document.querySelector("[data-victory-banner]");
    if (!(banner instanceof HTMLElement)) return;
    window.clearTimeout(state.victoryTimer);
    banner.hidden = false;
    banner.classList.remove("is-celebrating");
    void banner.offsetWidth;
    banner.classList.add("is-celebrating");
    state.victoryTimer = window.setTimeout(() => {
      banner.hidden = true;
      banner.classList.remove("is-celebrating");
    }, 4200);
  };

  const progressPayload = (extra = {}) => ({
    collectibles: [...new Set(state.progress.unlocked_collectibles)],
    discovered_zones: [...new Set(state.progress.discovered_zones)],
    last_position: { ...state.position },
    ...extra,
  });

  let progressQueue = Promise.resolve();
  const syncProgress = (extra = {}) => {
    if (!state.authenticated) {
      setStatus("Sign in to save your island discoveries.", true);
      return Promise.reject(new Error("Sign in to save progress."));
    }
    const payload = progressPayload(extra);
    const request = progressQueue.catch(() => {}).then(() => api("/api/games/sunny-island/progress", "POST", payload));
    progressQueue = request.catch(() => {});
    return request.then((result) => {
      updateProgress(result.progress);
      if (result.session) updateSession(result.session);
      state.dirty = false;
      renderMap();
      return result;
    });
  };

  const scheduleProgressSync = (immediate = false) => {
    if (!state.authenticated) return;
    state.dirty = true;
    window.clearTimeout(state.progressTimer);
    const delay = immediate ? 0 : 650;
    state.progressTimer = window.setTimeout(() => {
      syncProgress().catch((error) => setStatus(error.message, true));
    }, delay);
  };

  const refreshWallet = async () => {
    if (!state.authenticated) return;
    const wallet = await api("/api/wallet");
    state.earnedCoins = Number(wallet.earned_coin_balance) || 0;
    renderProgress();
  };

  const loadState = async () => {
    try {
      const result = await api("/api/games/sunny-island/state");
      state.authenticated = true;
      updateProgress(result.state.progress);
      state.codex = result.state.codex;
      state.adventure = result.state.adventure;
      loadImages(state.codex);
      if (result.state.progress.last_position) {
        state.position = { ...result.state.progress.last_position };
      }
      updateSession(result.state.adventure.active_session);
      renderProgress();
      renderMap();
      await refreshWallet().catch(() => {
        state.earnedCoins = null;
        renderProgress();
      });
      setStatus(state.session ? "Your daily adventure is ready to continue." : "Welcome to Sunny Island. Explore freely or start today's adventure.");
      scheduleProgressSync(true);
    } catch (error) {
      state.authenticated = false;
      const fallbackCatalog = [
        { id: "golden_compass", name: "Golden Compass", image: "/assets/hero-loot/gold-coin.webp" },
        { id: "neon_relic", name: "Neon Relic", image: "/assets/hero-loot/weapon-ak47.webp" },
        { id: "drift_token", name: "Drift Token", image: "/assets/hero-loot/weapon-mp40.webp" },
        { id: "sun_crate", name: "Sun Crate", image: "/assets/hero-loot/loot-crate.webp" },
        { id: "palm_pack", name: "Palm Pack", image: "/assets/hero-loot/backpack.webp" },
        { id: "snoop_badge", name: "Snoop Badge", image: "/assets/hero-loot/snoop-sticker-01.webp" },
        { id: "reef_sticker", name: "Reef Sticker", image: "/assets/hero-loot/snoop-sticker-02.webp" },
        { id: "sunset_sticker", name: "Sunset Sticker", image: "/assets/hero-loot/snoop-sticker-03.webp" },
        { id: "canyon_sticker", name: "Canyon Sticker", image: "/assets/hero-loot/snoop-sticker-04.webp" },
      ];
      state.codex = fallbackCatalog;
      loadImages(state.codex);
      updateSession(null);
      renderProgress();
      renderMap();
      const statusText = error.code === "AUTH_REQUIRED"
        ? "Sign in to save progress and earn rewards. You can still explore the island."
        : (error instanceof Error ? error.message : "The island could not be loaded.");
      setStatus(statusText, error.code !== "AUTH_REQUIRED");
    }
  };

  const nearest = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const objectsForZone = (zone) => {
    const objects = [];
    for (const pickup of PICKUPS) {
      if (pickup.zone === zone && !state.progress.unlocked_collectibles.includes(pickup.id)) {
        objects.push({ ...pickup, type: "collectible" });
      }
    }
    for (const beacon of BEACONS) {
      if (beacon.zone === zone && !state.beaconActivations.has(beacon.id)) {
        objects.push({ ...beacon, type: "beacon" });
      }
    }
    if (QUEST_BOARD.zone === zone) objects.push({ ...QUEST_BOARD, type: "board" });
    if (DROP_MARKER.zone === zone) objects.push({ ...DROP_MARKER, type: "drops" });
    if (BELLSPIRE.zone === zone) objects.push({ ...BELLSPIRE, type: "bellspire" });
    for (const portal of PORTALS[zone] || []) {
      objects.push({ ...portal, type: "portal" });
    }
    return objects;
  };

  const updateInteraction = () => {
    const objects = objectsForZone(state.position.zone);
    if (state.position.zone === SUPPLY_DROP.zone && isSupplyDropActive(performance.now())) {
      objects.push({ ...SUPPLY_DROP, type: "supply" });
    }
    const object = objects
      .map((item) => ({ ...item, distance: nearest(state.position, item) }))
      .filter((item) => item.distance <= INTERACTION_RADIUS)
      .sort((a, b) => a.distance - b.distance)[0] || null;
    state.activeInteraction = object;
    const panel = document.querySelector("[data-interaction]");
    const label = document.querySelector("[data-interaction-label]");
    if (!(panel instanceof HTMLElement) || !(label instanceof HTMLElement)) return;
    const key = object ? `${object.type}:${object.id}` : "";
    if (key !== state.interactionKey) {
      state.interactionKey = key;
      if (object) {
        const prefix = window.matchMedia("(pointer: coarse)").matches ? "Tap action" : "E / Space";
        label.textContent = `${prefix} · ${object.label}`;
      }
    }
    panel.hidden = !object;
  };

  const objectiveFor = (id) => state.session?.objectives?.find((objective) => objective.id === id && !objective.completed) || null;

  const markObjective = async (id) => {
    const objective = objectiveFor(id);
    if (!objective || state.busy) return false;
    if (state.position.zone !== objective.zone) {
      toast(`Travel to ${ZONES[objective.zone]} to finish this objective.`);
      return false;
    }
    if (id === "collect_drops" && state.progress.unlocked_collectibles.length < Number(objective.target_count || 3)) {
      toast(`Discover ${Math.max(0, Number(objective.target_count || 3) - state.progress.unlocked_collectibles.length)} more keepsake(s) first.`);
      return false;
    }
    if (id === "find_relic" && !state.progress.unlocked_collectibles.includes("golden_compass")) {
      toast(`Find the Golden Compass in ${ZONES.loot_canyon} first.`);
      return false;
    }
    state.busy = true;
    renderProgress();
    try {
      const result = await syncProgress({
        session_id: state.session.id,
        completed_objectives: [id],
      });
      if (result.session) updateSession(result.session);
      toast(`Objective complete · ${objective.description}`, 3000);
      setStatus(`${objective.description} Complete!`);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Objective progress could not be saved.", true);
      return false;
    } finally {
      state.busy = false;
      renderProgress();
    }
  };

  const pickUp = async (item) => {
    if (state.progress.unlocked_collectibles.includes(item.id)) return;
    if (!state.authenticated) {
      toast("Sign in to add this treasure to your Codex.");
      return;
    }
    state.busy = true;
    renderProgress();
    try {
      const result = await syncProgress({
        collectibles: [...state.progress.unlocked_collectibles, item.id],
      });
      if (result.progress) updateProgress(result.progress);
      spawnBurst(state.position.x, state.position.y, "#ffe078", 18);
      addFloatingText(state.position.x, state.position.y - 42, `+ ${item.label}`, "#fff9ce");
      toast(`${item.label} added to your Island Codex!`, 2800);
      setStatus(`${item.label} discovered.`);
      state.busy = false;
      renderProgress();
      if (item.id === "golden_compass" && state.position.zone === "loot_canyon") {
        await markObjective("find_relic");
      }
      if (state.position.zone === "palm_grove"
        && state.progress.unlocked_collectibles.length >= 3
        && objectiveFor("collect_drops")) {
        await markObjective("collect_drops");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "This treasure could not be saved.", true);
    } finally {
      state.busy = false;
      renderProgress();
      updateInteraction();
    }
  };

  const enterZone = async (zone) => {
    const entrance = { x: 790, y: 510 };
    state.position = { zone, ...entrance };
    state.facing = zone === "neon_pier" ? { x: -1, y: 0 } : { x: 1, y: 0 };
    state.progress.discovered_zones = [...new Set([...state.progress.discovered_zones, zone])];
    renderMap();
    spawnBurst(state.position.x, state.position.y, "#fff5c3", 12);
    toast(`Welcome to ${ZONES[zone]}!`, 2200);
    setStatus(`Entered ${ZONES[zone]}. Your location is being saved.`);
    await syncProgress({ discovered_zones: state.progress.discovered_zones });
    if (zone === "palm_grove" && state.progress.unlocked_collectibles.length >= 3) {
      await markObjective("collect_drops");
    }
    if (zone === "sunset_ridge") {
      await markObjective("reach_sunset_ridge");
    }
    updateInteraction();
  };

  const activateBeacon = async (beacon) => {
    state.beaconActivations.add(beacon.id);
    spawnBurst(beacon.x, beacon.y - 20, "#b4f7dc", 14);
    if (state.beaconActivations.size < 2) {
      toast(`Beacon lit · ${2 - state.beaconActivations.size} more to go!`);
      setStatus("A pier beacon is humming. Find and activate the other beacon.");
      updateInteraction();
      return;
    }
    if (objectiveFor("activate_beacons")) await markObjective("activate_beacons");
    else toast("Both ancient beacons are glowing!");
    updateInteraction();
  };

  const interact = async () => {
    const item = state.activeInteraction;
    if (!item || state.busy) return;
    if (item.type === "collectible") {
      await pickUp(item);
    } else if (item.type === "beacon") {
      await activateBeacon(item);
    } else if (item.type === "board") {
      if (state.session && ["started", "in_progress"].includes(state.session.status)) {
        toast("Your daily adventure is already in progress.");
      } else if (state.adventure.attempts_remaining_today > 0) {
        await startAdventure();
      } else {
        toast("Today's free adventures are used. You can still explore and collect treasures.");
      }
    } else if (item.type === "drops") {
      if (!objectiveFor("collect_drops")) {
        toast("Sunny drops sparkle here when you have an active daily adventure.");
      } else {
        await markObjective("collect_drops");
      }
    } else if (item.type === "bellspire") {
      if (objectiveFor("reach_sunset_ridge")) await markObjective("reach_sunset_ridge");
      else toast("The whole island glows from the Solstice Bellspire.");
    } else if (item.type === "supply") {
      const drop = PICKUPS.find((pickup) => pickup.zone === "loot_canyon"
        && !state.progress.unlocked_collectibles.includes(pickup.id));
      if (drop) {
        await pickUp(drop);
      } else {
        toast("This supply drop is empty. Check back when the next drop arrives.");
      }
    } else if (item.type === "portal") {
      await enterZone(item.zone);
    }
  };

  const startAdventure = async () => {
    if (!state.authenticated) {
      setStatus("Sign in to start a daily adventure and earn rewards.", true);
      return;
    }
    if (state.busy || state.adventure.attempts_remaining_today < 1) return;
    state.busy = true;
    renderProgress();
    try {
      const key = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `sunny-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      const result = await api("/api/games/sunny-island/start", "POST", { idempotency_key: key });
      updateSession(result.session);
      state.adventure.attempts_remaining_today = result.attempts_remaining_today;
      state.adventure.reward_amount_coins = result.reward_amount_coins;
      state.beaconActivations.clear();
      renderProgress();
      setStatus("Your three daily objectives are ready. Adventure on!");
      toast("Daily Adventure started!", 2500);
      if (result.session.objectives.some((objective) => objective.zone === state.position.zone)) {
        scheduleProgressSync(true);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "A daily adventure could not be started.", true);
    } finally {
      state.busy = false;
      renderProgress();
    }
  };

  const completeAdventure = async () => {
    if (!state.session || state.busy) return;
    const previousLevel = state.progress.level;
    state.busy = true;
    renderProgress();
    try {
      const result = await api("/api/games/sunny-island/complete", "POST", {
        session_id: state.session.id,
        collectibles: state.progress.unlocked_collectibles,
        discovered_zones: state.progress.discovered_zones,
        last_position: { ...state.position },
      });
      updateProgress(result.progress);
      updateSession(result.session);
      await refreshWallet();
      const levelText = result.progress.level > previousLevel
        ? ` Level up! You are now level ${result.progress.level}.`
        : "";
      toast(`Adventure complete! +${result.xp_awarded} XP · +${formatNumber(result.reward.amount)} Earned Coins.${levelText}`, 5200);
      setStatus(`Adventure complete! ${formatNumber(result.reward.amount)} Earned Coins added to your wallet.`);
      celebrateVictory();
      if (result.reward.amount > 0) spawnBurst(state.position.x, state.position.y, "#ffda62", 36);
      await loadStateAfterComplete(result);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The adventure could not be completed.", true);
    } finally {
      state.busy = false;
      renderProgress();
    }
  };

  const loadStateAfterComplete = async (result) => {
    state.progress = result.progress;
    const refreshed = await api("/api/games/sunny-island/state");
    state.adventure = refreshed.state.adventure;
    state.session = null;
    renderProgress();
    renderMap();
  };

  const spawnBurst = (x, y, color, count = 10) => {
    for (let index = 0; index < count; index++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 110;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        size: 2 + Math.random() * 5,
        life: .55 + Math.random() * .45,
        color,
      });
    }
  };

  const addFloatingText = (x, y, text, color = "#fff") => {
    state.floatingTexts.push({ x, y, text, color, life: 1.15 });
  };

  const isSupplyDropActive = (now) => {
    const cycle = 52000;
    const activeWindow = 17000;
    return (now - state.startedAt) % cycle < activeWindow;
  };

  const drawRoundRect = (ctx, x, y, width, height, radius, fill, stroke = null) => {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const drawPalm = (ctx, x, y, scale = 1, color = "#438c67") => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#986b4a";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-16, -85, 10, -175);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.strokeStyle = "#79583f";
    ctx.beginPath();
    ctx.moveTo(-2, -18);
    ctx.lineTo(-7, -31);
    ctx.stroke();
    const crownY = -176;
    for (let index = 0; index < 7; index++) {
      const angle = -Math.PI * .92 + (Math.PI * .84 / 6) * index;
      ctx.save();
      ctx.translate(8, crownY);
      ctx.rotate(angle);
      ctx.fillStyle = index % 2 ? color : "#69b77b";
      ctx.strokeStyle = "#327853";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(32, -40, 86, -15);
      ctx.quadraticCurveTo(48, 4, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = "#f3bc61";
    ctx.beginPath();
    ctx.arc(8, crownY + 6, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawStiltHut = (ctx, x, floor, scale = 1) => {
    ctx.save();
    ctx.translate(x, floor);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "#79583f";
    ctx.lineWidth = 12;
    for (const postX of [-56, -18, 22, 57]) {
      ctx.beginPath();
      ctx.moveTo(postX, -22);
      ctx.lineTo(postX + (postX < 0 ? 5 : -5), 92);
      ctx.stroke();
    }
    drawRoundRect(ctx, -77, -103, 154, 79, 7, "#b57c53", "#704c3b");
    ctx.fillStyle = "#e7b46b";
    ctx.beginPath();
    ctx.moveTo(-92, -98);
    ctx.lineTo(-54, -153);
    ctx.lineTo(13, -150);
    ctx.lineTo(93, -96);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#76503b";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#5b463e";
    ctx.fillRect(-57, -84, 37, 37);
    ctx.fillRect(22, -84, 37, 37);
    ctx.strokeStyle = "#ffda88";
    ctx.lineWidth = 3;
    ctx.strokeRect(-57, -84, 37, 37);
    ctx.strokeRect(22, -84, 37, 37);
    ctx.fillStyle = "#8b5a42";
    ctx.fillRect(-9, -73, 21, 49);
    ctx.fillStyle = "#7de8e9";
    ctx.fillRect(-49, -77, 20, 23);
    ctx.fillRect(30, -77, 20, 23);
    ctx.fillStyle = "#d8a162";
    ctx.fillRect(-87, -25, 174, 9);
    ctx.restore();
  };

  const drawBoat = (ctx, x, y, scale, color) => {
    ctx.save();
    ctx.translate(x, y + Math.sin(x * .03 + y) * 2);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#285d70";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-65, -7);
    ctx.lineTo(64, -7);
    ctx.lineTo(43, 19);
    ctx.quadraticCurveTo(0, 32, -43, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4e3b2";
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.lineTo(27, -8);
    ctx.lineTo(11, -44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#795a43";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(0, -7);
    ctx.stroke();
    ctx.restore();
  };

  const drawCargoContainer = (ctx, x, y, width, height, color) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#344d5c";
    ctx.lineWidth = 4;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    ctx.strokeStyle = "rgb(255 255 255 / 27%)";
    ctx.lineWidth = 3;
    for (let ribX = x + 12; ribX < x + width; ribX += 19) {
      ctx.beginPath();
      ctx.moveTo(ribX, y + 5);
      ctx.lineTo(ribX, y + height - 5);
      ctx.stroke();
    }
    ctx.fillStyle = "rgb(255 255 255 / 22%)";
    ctx.fillRect(x + 7, y + 7, width - 14, 5);
  };

  const drawHazardBarrel = (ctx, x, y, color = "#e29642") => {
    ctx.save();
    ctx.translate(x, y);
    drawRoundRect(ctx, -15, -27, 30, 52, 7, color, "#684b3e");
    ctx.fillStyle = "#313c43";
    ctx.fillRect(-13, -8, 26, 10);
    ctx.strokeStyle = "#f7e5a5";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(10, -5);
    ctx.stroke();
    ctx.restore();
  };

  const drawCrystalCover = (ctx, x, y) => {
    ctx.fillStyle = "rgb(105 218 237 / 52%)";
    ctx.strokeStyle = "#4aafc9";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 64, y + 20);
    ctx.lineTo(x - 54, y - 31);
    ctx.lineTo(x - 30, y - 22);
    ctx.lineTo(x - 15, y - 52);
    ctx.lineTo(x + 6, y - 28);
    ctx.lineTo(x + 31, y - 44);
    ctx.lineTo(x + 56, y - 22);
    ctx.lineTo(x + 64, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgb(255 255 255 / 78%)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 41);
    ctx.lineTo(x - 4, y + 8);
    ctx.lineTo(x + 23, y - 24);
    ctx.stroke();
  };

  const drawWatchtower = (ctx, x, y) => {
    ctx.fillStyle = "#80614b";
    ctx.fillRect(x - 9, y - 7, 18, 110);
    ctx.fillStyle = "#d5b886";
    ctx.strokeStyle = "#795c48";
    ctx.lineWidth = 4;
    ctx.fillRect(x - 43, y - 70, 86, 62);
    ctx.strokeRect(x - 43, y - 70, 86, 62);
    ctx.fillStyle = "#405c61";
    ctx.fillRect(x - 25, y - 55, 16, 22);
    ctx.fillRect(x + 9, y - 55, 16, 22);
    ctx.fillStyle = "#a36b4c";
    ctx.beginPath();
    ctx.moveTo(x - 53, y - 70);
    ctx.lineTo(x, y - 105);
    ctx.lineTo(x + 53, y - 70);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#684e40";
    ctx.lineWidth = 4;
    ctx.stroke();
  };

  const drawBackground = (ctx, zone, time) => {
    const sky = {
      neon_pier: ["#5fcadd", "#b8f1e7"],
      palm_grove: ["#8bcf9c", "#e0e9a2"],
      loot_canyon: ["#9ab8bc", "#e2b678"],
      sunset_ridge: ["#ed987b", "#f8d68b"],
    }[zone] || ["#78d8ea", "#d9f8f2"];
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, sky[0]);
    gradient.addColorStop(1, sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    if (zone === "neon_pier") {
      ctx.fillStyle = "#42bfd0";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.fillStyle = "#45c8d4";
      for (let index = 0; index < 19; index++) {
        const y = 35 + index * 38;
        ctx.globalAlpha = .24 + Math.sin(time * 2.4 + index) * .08;
        ctx.strokeStyle = index % 2 ? "#eafffc" : "#b6fbf1";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = 0; x <= WORLD.width; x += 42) {
          const waveY = y + Math.sin(x * .008 + time * 1.5 + index) * 6;
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#276e70";
      ctx.beginPath();
      ctx.ellipse(360, 248, 280, 96, -.05, 0, Math.PI * 2);
      ctx.ellipse(1240, 220, 330, 110, .04, 0, Math.PI * 2);
      ctx.fill();
      drawBoat(ctx, 440, 335, .86, "#e47859");
      drawBoat(ctx, 935, 305, 1.12, "#315d8a");
      drawBoat(ctx, 1450, 372, .7, "#f2c96f");
      for (const postX of [120, 330, 550, 770, 990, 1210, 1430, 1570]) {
        ctx.fillStyle = "#684a3d";
        ctx.fillRect(postX - 7, 430, 14, 300);
      }
      drawStiltHut(ctx, 245, 455, .9);
      drawStiltHut(ctx, 1135, 420, 1.08);
      drawStiltHut(ctx, 690, 360, .68);
      ctx.fillStyle = "#a96849";
      ctx.fillRect(0, 475, WORLD.width, 195);
      ctx.fillStyle = "#d38d5f";
      for (let x = 0; x < WORLD.width; x += 73) {
        ctx.fillRect(x, 475, 6, 195);
      }
      ctx.fillStyle = "#f2bd78";
      for (let y = 485; y < 670; y += 39) ctx.fillRect(0, y, WORLD.width, 4);
      ctx.fillStyle = "#dfc47f";
      ctx.fillRect(0, 760, WORLD.width, 240);
      for (const palmX of [65, 380, 745, 1115, 1510]) {
        drawPalm(ctx, palmX, 895, .54, "#398b68");
      }
      ctx.save();
      ctx.setLineDash([17, 15]);
      ctx.lineDashOffset = -time * 22;
      ctx.strokeStyle = `rgb(120 251 255 / ${42 + Math.sin(time * 2) * 10}%)`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(800, 510, 760, 455, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (zone === "palm_grove") {
      ctx.fillStyle = "#74ba72";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.fillStyle = "#8dc778";
      for (let index = 0; index < 8; index++) {
        ctx.beginPath();
        ctx.ellipse(index * 230 + 30, 205 + (index % 2) * 38, 190, 115, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#d1bb86";
      ctx.beginPath();
      ctx.moveTo(0, 690);
      ctx.bezierCurveTo(330, 560, 470, 840, 760, 635);
      ctx.bezierCurveTo(1010, 470, 1270, 730, WORLD.width, 520);
      ctx.lineTo(WORLD.width, 815);
      ctx.bezierCurveTo(1260, 930, 1010, 730, 760, 870);
      ctx.bezierCurveTo(440, 1010, 250, 785, 0, 940);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8c7458";
      ctx.fillRect(450, 235, 700, 15);
      ctx.fillStyle = "#ceb990";
      ctx.fillRect(485, 250, 630, 198);
      ctx.fillStyle = "#b39a73";
      ctx.fillRect(505, 260, 590, 18);
      ctx.fillRect(500, 425, 600, 22);
      ctx.fillStyle = "#6b7760";
      ctx.fillRect(530, 278, 540, 142);
      for (const columnX of [540, 624, 716, 810, 904, 990, 1065]) {
        ctx.fillStyle = "#d6c29a";
        ctx.fillRect(columnX, 278, 17, 144);
        ctx.fillStyle = "#a88d69";
        ctx.fillRect(columnX - 5, 278, 27, 10);
        ctx.fillRect(columnX - 5, 412, 27, 10);
      }
      ctx.strokeStyle = "#d7c49b";
      ctx.lineWidth = 20;
      for (const archX of [670, 855, 1018]) {
        ctx.beginPath();
        ctx.moveTo(archX - 36, 421);
        ctx.lineTo(archX - 36, 334);
        ctx.arc(archX, 334, 36, Math.PI, 0);
        ctx.lineTo(archX + 36, 421);
        ctx.stroke();
      }
      ctx.fillStyle = "#987b58";
      for (const block of [
        [457, 250, 66, 25], [540, 216, 118, 20], [735, 230, 56, 22],
        [944, 218, 68, 23], [1058, 246, 94, 24], [478, 438, 160, 20],
        [705, 438, 136, 20], [897, 438, 216, 20],
      ]) ctx.fillRect(...block);
      drawWatchtower(ctx, 1330, 390);
      for (const crateX of [320, 1260]) {
        drawRoundRect(ctx, crateX - 31, 625, 62, 54, 7, "#a97845", "#62573e");
        ctx.strokeStyle = "#e3c484";
        ctx.lineWidth = 3;
        ctx.strokeRect(crateX - 22, 634, 44, 36);
        ctx.beginPath();
        ctx.moveTo(crateX - 22, 634);
        ctx.lineTo(crateX + 22, 670);
        ctx.moveTo(crateX + 22, 634);
        ctx.lineTo(crateX - 22, 670);
        ctx.stroke();
      }
      for (let index = 0; index < 6; index++) {
        drawPalm(ctx, 105 + index * 265, 910 - (index % 3) * 45, .43 + (index % 2) * .09, "#478656");
      }
    } else if (zone === "loot_canyon") {
      ctx.fillStyle = "#8a9b91";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.fillStyle = "#b8aa87";
      ctx.fillRect(0, 715, WORLD.width, 285);
      ctx.fillStyle = "#d0bd91";
      ctx.fillRect(0, 755, WORLD.width, 7);
      ctx.fillRect(0, 940, WORLD.width, 7);
      for (let x = 70; x < WORLD.width; x += 200) {
        ctx.fillStyle = "rgb(65 79 75 / 23%)";
        ctx.fillRect(x, 770, 95, 4);
      }
      ctx.fillStyle = "#586a68";
      ctx.fillRect(255, 170, 1090, 290);
      ctx.fillStyle = "#71827a";
      ctx.fillRect(282, 200, 1035, 232);
      ctx.fillStyle = "#3e5052";
      ctx.fillRect(320, 248, 170, 150);
      ctx.fillRect(548, 248, 170, 150);
      ctx.fillRect(776, 248, 170, 150);
      ctx.fillRect(1004, 248, 270, 150);
      ctx.fillStyle = "#31484d";
      ctx.fillRect(282, 423, 1035, 18);
      ctx.strokeStyle = "#d2b37b";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(230, 200);
      ctx.lineTo(1370, 200);
      ctx.moveTo(310, 168);
      ctx.lineTo(310, 445);
      ctx.moveTo(1290, 168);
      ctx.lineTo(1290, 445);
      for (let x = 310; x < 1280; x += 160) {
        ctx.moveTo(x, 200);
        ctx.lineTo(x + 80, 265);
        ctx.lineTo(x + 160, 200);
      }
      ctx.stroke();
      ctx.fillStyle = "#edf0d0";
      ctx.font = "900 23px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("SKYCRATE WORKS", 800, 235);
      drawCargoContainer(ctx, 74, 536, 262, 158, "#d46f55");
      drawCargoContainer(ctx, 368, 592, 265, 117, "#4f8e98");
      drawCargoContainer(ctx, 1025, 535, 260, 155, "#d7aa55");
      drawCargoContainer(ctx, 1320, 590, 205, 121, "#637bb0");
      drawHazardBarrel(ctx, 220, 720);
      drawHazardBarrel(ctx, 670, 695, "#cc6550");
      drawHazardBarrel(ctx, 930, 735);
      drawHazardBarrel(ctx, 1450, 750, "#cc6550");
      drawCrystalCover(ctx, 730, 585);
      drawCrystalCover(ctx, 935, 620);
      ctx.fillStyle = "#a26b4c";
      for (const crateX of [415, 812, 1180]) {
        drawRoundRect(ctx, crateX - 23, 725, 46, 38, 5, "#a26b4c", "#5e554a");
        ctx.strokeStyle = "#e2bc78";
        ctx.lineWidth = 2;
        ctx.strokeRect(crateX - 15, 732, 30, 23);
      }
      ctx.fillStyle = "rgb(255 255 255 / 22%)";
      ctx.beginPath();
      ctx.ellipse(800, 860, 680, 44, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#eeae77";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.fillStyle = "#bd7b74";
      ctx.beginPath();
      ctx.moveTo(0, 580);
      ctx.lineTo(220, 255);
      ctx.lineTo(470, 535);
      ctx.lineTo(700, 190);
      ctx.lineTo(975, 545);
      ctx.lineTo(1240, 235);
      ctx.lineTo(1600, 515);
      ctx.lineTo(1600, 760);
      ctx.lineTo(0, 760);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#8d6772";
      ctx.beginPath();
      ctx.moveTo(0, 665);
      ctx.lineTo(285, 470);
      ctx.lineTo(500, 688);
      ctx.lineTo(735, 450);
      ctx.lineTo(1000, 690);
      ctx.lineTo(1240, 465);
      ctx.lineTo(1510, 680);
      ctx.lineTo(1600, 640);
      ctx.lineTo(1600, 1000);
      ctx.lineTo(0, 1000);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#d7b979";
      ctx.beginPath();
      ctx.moveTo(0, 770);
      ctx.quadraticCurveTo(360, 665, 700, 805);
      ctx.quadraticCurveTo(1090, 950, 1600, 760);
      ctx.lineTo(1600, 1000);
      ctx.lineTo(0, 1000);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgb(255 235 185 / 40%)";
      ctx.lineWidth = 4;
      for (let x = 80; x < WORLD.width; x += 95) {
        ctx.beginPath();
        ctx.moveTo(x, 815 + (x % 3) * 9);
        ctx.lineTo(x + 55, 815 + (x % 3) * 9);
        ctx.stroke();
      }
      ctx.fillStyle = "rgb(255 244 189 / 20%)";
      ctx.fillRect(0, 732, WORLD.width, 8);
      const sunX = 1295 + Math.sin(time * .1) * 6;
      const sun = ctx.createRadialGradient(sunX, 155, 15, sunX, 155, 115);
      sun.addColorStop(0, "rgb(255 245 170 / 95%)");
      sun.addColorStop(1, "rgb(255 210 111 / 0%)");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(sunX, 155, 115, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgb(255 255 255 / 13%)";
    for (let index = 0; index < 18; index++) {
      const x = (index * 113 + time * (8 + index % 5)) % WORLD.width;
      const y = 90 + (index * 71) % 740;
      ctx.beginPath();
      ctx.arc(x, y, 2 + index % 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawBeacon = (ctx, beacon, time) => {
    const pulse = 1 + Math.sin(time * 3 + beacon.x) * .06;
    ctx.save();
    ctx.translate(beacon.x, beacon.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#856d60";
    ctx.strokeStyle = "#5f554f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-31, 4);
    ctx.lineTo(-24, -45);
    ctx.lineTo(23, -45);
    ctx.lineTo(31, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4cf67";
    ctx.strokeStyle = "#fff2ac";
    ctx.beginPath();
    ctx.arc(0, -50, 18 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  const drawBoard = (ctx, time) => {
    const x = QUEST_BOARD.x;
    const y = QUEST_BOARD.y;
    ctx.fillStyle = "#80563c";
    ctx.fillRect(x - 9, y - 52, 18, 87);
    drawRoundRect(ctx, x - 48, y - 100, 96, 59, 9, "#efbb58", "#885736");
    ctx.fillStyle = "#fff5d5";
    ctx.font = "800 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("QUEST", x, y - 68);
    ctx.fillText("BOARD", x, y - 50);
    ctx.fillStyle = "#ed7954";
    ctx.beginPath();
    ctx.arc(x + 33, y - 89 + Math.sin(time * 3) * 3, 7, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawBellspire = (ctx, time) => {
    const x = BELLSPIRE.x;
    const y = BELLSPIRE.y;
    const glow = ctx.createRadialGradient(x, y - 205, 18, x, y - 205, 195);
    glow.addColorStop(0, "rgb(255 238 160 / 27%)");
    glow.addColorStop(1, "rgb(255 238 160 / 0%)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 205, 195, 0, Math.PI * 2);
    ctx.fill();
    drawRoundRect(ctx, x - 77, y - 223, 154, 233, 16, "#bd916b", "#745347");
    ctx.fillStyle = "#d6b283";
    ctx.fillRect(x - 60, y - 207, 16, 198);
    ctx.fillRect(x + 44, y - 207, 16, 198);
    ctx.fillStyle = "#80604e";
    ctx.fillRect(x - 82, y - 224, 164, 16);
    drawRoundRect(ctx, x - 69, y - 288, 138, 76, 13, "#c6a078", "#745347");
    ctx.fillStyle = "#87654f";
    ctx.fillRect(x - 77, y - 218, 154, 12);

    ctx.fillStyle = "#f4e3b4";
    ctx.strokeStyle = "#77513e";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y - 250, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#a67a53";
    ctx.lineWidth = 2;
    for (let tick = 0; tick < 12; tick++) {
      const angle = tick * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 25, y - 250 + Math.sin(angle) * 25);
      ctx.lineTo(x + Math.cos(angle) * 29, y - 250 + Math.sin(angle) * 29);
      ctx.stroke();
    }
    ctx.strokeStyle = "#4e4850";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y - 250);
    ctx.lineTo(x + Math.sin(time * .16) * 15, y - 250 - Math.cos(time * .16) * 15);
    ctx.moveTo(x, y - 250);
    ctx.lineTo(x - 15, y - 250 + Math.cos(time * .08) * 15);
    ctx.stroke();
    ctx.fillStyle = "#e0bd78";
    ctx.beginPath();
    ctx.arc(x, y - 250, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8b6653";
    ctx.beginPath();
    ctx.moveTo(x - 90, y - 286);
    ctx.lineTo(x, y - 350);
    ctx.lineTo(x + 90, y - 286);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#63483f";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#e4c47f";
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 337);
    ctx.lineTo(x, y - 366);
    ctx.lineTo(x + 11, y - 337);
    ctx.closePath();
    ctx.fill();
    drawRoundRect(ctx, x - 27, y - 77, 54, 87, 25, "#5c4a4b", "#735344");
    drawRoundRect(ctx, x - 13, y - 63, 26, 73, 13, "#332f43");
    ctx.fillStyle = "#d2ab72";
    for (const windowX of [x - 51, x + 51]) {
      ctx.beginPath();
      ctx.arc(windowX, y - 131, 12, Math.PI, 0);
      ctx.lineTo(windowX + 12, y - 106);
      ctx.lineTo(windowX - 12, y - 106);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#5e554d";
    ctx.fillRect(x - 83, y + 8, 166, 12);
  };

  const drawSupplyDrop = (ctx, time) => {
    if (!isSupplyDropActive(time * 1000)) return;
    const image = imageFor("sun_crate");
    const pulse = 1 + Math.sin(time * 5) * .05;
    ctx.save();
    ctx.translate(SUPPLY_DROP.x, SUPPLY_DROP.y);
    ctx.globalAlpha = .2 + Math.sin(time * 3) * .04;
    ctx.fillStyle = "#ffcf63";
    ctx.beginPath();
    ctx.moveTo(-15, -45);
    ctx.lineTo(-73, -260);
    ctx.lineTo(73, -260);
    ctx.lineTo(15, -45);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let index = 0; index < 5; index++) {
      const smokeX = Math.sin(time * 2.4 + index) * (12 + index * 6);
      const smokeY = -95 - ((time * 28 + index * 34) % 130);
      ctx.globalAlpha = .34 - index * .035;
      ctx.fillStyle = index % 2 ? "#79e8ec" : "#ffd46e";
      ctx.beginPath();
      ctx.arc(smokeX, smokeY, 15 + index * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgb(255 230 117 / 28%)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 65, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    if (image?.complete && image.naturalWidth) {
      ctx.drawImage(image, -34, -60, 68, 68);
    } else {
      drawRoundRect(ctx, -30, -54, 60, 55, 9, "#e29c48", "#815938");
    }
    ctx.fillStyle = "#fff6c8";
    ctx.font = "800 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("AIR DROP", 0, 31);
    ctx.restore();
  };

  const drawPortal = (ctx, portal, time) => {
    ctx.save();
    ctx.translate(portal.x, portal.y);
    ctx.strokeStyle = "#fff1bd";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, -23, 36 + Math.sin(time * 2) * 2, 48, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(36, 0);
    ctx.stroke();
    ctx.fillStyle = "rgb(116 221 221 / 42%)";
    ctx.beginPath();
    ctx.ellipse(0, -27, 24, 33, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawPickup = (ctx, item, time) => {
    const image = imageFor(item.id);
    const float = Math.sin(time * 3 + item.x * .02) * 5;
    ctx.save();
    ctx.translate(item.x, item.y - 20 + float);
    ctx.fillStyle = "rgb(255 238 139 / 24%)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 35, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    if (image?.complete && image.naturalWidth) {
      ctx.shadowColor = "rgb(47 91 103 / 28%)";
      ctx.shadowBlur = 9;
      ctx.drawImage(image, -25, -25, 50, 50);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = colors.gold;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff7cd";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawAmbientArt = (ctx, zone, time) => {
    for (const art of AMBIENT_ART) {
      if (art.zone !== zone) continue;
      const image = imageFor(art.imageId);
      if (!image?.complete || !image.naturalWidth) continue;
      const bob = Math.sin(time * 1.7 + art.x) * 4;
      ctx.globalAlpha = .78;
      ctx.drawImage(image, art.x - 26, art.y - 26 + bob, 52, 52);
      ctx.globalAlpha = 1;
    }
  };

  const drawWeaponCaches = (ctx, time) => {
    const caches = [
      { imageId: "neon_relic", x: 250, y: 610, tint: "#df9b53" },
      { imageId: "drift_token", x: 1390, y: 645, tint: "#77c8db" },
    ];
    for (const cache of caches) {
      ctx.save();
      ctx.translate(cache.x, cache.y + Math.sin(time * 2 + cache.x) * 2);
      ctx.fillStyle = "rgb(255 222 120 / 20%)";
      ctx.beginPath();
      ctx.ellipse(0, 16, 54, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      drawRoundRect(ctx, -42, -7, 84, 36, 7, "#344b59", "#273d4c");
      ctx.fillStyle = cache.tint;
      ctx.fillRect(-32, -2, 64, 5);
      const image = imageFor(cache.imageId);
      if (image?.complete && image.naturalWidth) {
        ctx.shadowColor = cache.tint;
        ctx.shadowBlur = 12;
        ctx.drawImage(image, -39, -59, 78, 60);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = "#fff4d0";
      ctx.font = "800 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GEAR CACHE", 0, 44);
      ctx.restore();
    }
  };

  const drawWorldObjects = (ctx, time) => {
    const zone = state.position.zone;
    if (zone === QUEST_BOARD.zone) drawBoard(ctx, time);
    if (zone === BELLSPIRE.zone) drawBellspire(ctx, time);
    if (zone === SUPPLY_DROP.zone) drawSupplyDrop(ctx, time);
    if (zone === "loot_canyon") drawWeaponCaches(ctx, time);
    for (const beacon of BEACONS) {
      if (beacon.zone === zone) drawBeacon(ctx, beacon, time);
    }
    for (const portal of PORTALS[zone] || []) drawPortal(ctx, portal, time);
    for (const item of PICKUPS) {
      if (item.zone === zone && !state.progress.unlocked_collectibles.includes(item.id)) {
        drawPickup(ctx, item, time);
      }
    }
    drawAmbientArt(ctx, zone, time);
  };

  const drawNeenAvatar = (ctx, look, runCycle) => {
    const outline = "#26304b";
    const stride = runCycle * 3.5;

    drawRoundRect(ctx, -19, -65, 13, 25, 5, look.jacket, outline);
    drawRoundRect(ctx, -16, -62, 7, 18, 3, "#e5bf61");
    drawRoundRect(ctx, -14, -59, 5, 14, 2, look.accent);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(-6, -27);
    ctx.lineTo(-7 - stride, -11);
    ctx.moveTo(6, -27);
    ctx.lineTo(7 + stride, -11);
    ctx.stroke();
    ctx.strokeStyle = "#f1cfb8";
    ctx.lineWidth = 7;
    ctx.stroke();
    drawRoundRect(ctx, -14 - stride, -10, 16, 9, 4, "#edf3f7", outline);
    drawRoundRect(ctx, -2 + stride, -10, 16, 9, 4, "#edf3f7", outline);
    drawRoundRect(ctx, -14 - stride, -3, 16, 4, 2, look.accent);
    drawRoundRect(ctx, -2 + stride, -3, 16, 4, 2, look.accent);

    ctx.fillStyle = look.jacket;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-13, -37);
    ctx.lineTo(-11, -28);
    ctx.quadraticCurveTo(0, -23, 12, -28);
    ctx.lineTo(14, -39);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = look.trim;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-11, -30);
    ctx.lineTo(11, -30);
    ctx.stroke();

    ctx.strokeStyle = outline;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(-12, -60);
    ctx.quadraticCurveTo(-21 - stride, -55, -20 - stride, -43);
    ctx.moveTo(12, -60);
    ctx.quadraticCurveTo(21 + stride, -54, 19 + stride, -42);
    ctx.stroke();
    ctx.strokeStyle = look.sleeve;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18 - stride, -51);
    ctx.lineTo(-14 - stride, -46);
    ctx.moveTo(17 + stride, -51);
    ctx.lineTo(13 + stride, -46);
    ctx.stroke();
    ctx.fillStyle = "#f1cfb8";
    ctx.beginPath();
    ctx.arc(-20 - stride, -41, 4, 0, Math.PI * 2);
    ctx.arc(19 + stride, -40, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f0cbb5";
    ctx.fillRect(-4, -67, 8, 8);
    ctx.fillStyle = look.jacket;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-13, -62);
    ctx.quadraticCurveTo(-10, -68, -5, -67);
    ctx.lineTo(7, -67);
    ctx.quadraticCurveTo(13, -65, 14, -59);
    ctx.lineTo(12, -37);
    ctx.quadraticCurveTo(0, -32, -12, -37);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -63);
    ctx.lineTo(0, -40);
    ctx.moveTo(-8, -53);
    ctx.lineTo(-4, -49);
    ctx.lineTo(-8, -45);
    ctx.moveTo(8, -53);
    ctx.lineTo(4, -49);
    ctx.lineTo(8, -45);
    ctx.stroke();
    drawRoundRect(ctx, -3, -45, 6, 6, 2, look.trim, outline);

    ctx.fillStyle = "#dfe7ef";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -87);
    ctx.lineTo(-20, -111);
    ctx.quadraticCurveTo(-7, -107, -1, -94);
    ctx.closePath();
    ctx.moveTo(10, -87);
    ctx.lineTo(20, -111);
    ctx.quadraticCurveTo(7, -107, 1, -94);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8b9bad";
    ctx.beginPath();
    ctx.moveTo(-11, -92);
    ctx.lineTo(-16, -105);
    ctx.lineTo(-5, -96);
    ctx.closePath();
    ctx.moveTo(11, -92);
    ctx.lineTo(16, -105);
    ctx.lineTo(5, -96);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f0cbb5";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -77, 14, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e2e8ef";
    ctx.beginPath();
    ctx.moveTo(-14, -81);
    ctx.quadraticCurveTo(-18, -96, -8, -99);
    ctx.quadraticCurveTo(-2, -105, 2, -98);
    ctx.quadraticCurveTo(10, -103, 16, -96);
    ctx.lineTo(13, -82);
    ctx.quadraticCurveTo(5, -89, 0, -86);
    ctx.quadraticCurveTo(-6, -92, -14, -81);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#d1dce7";
    ctx.beginPath();
    ctx.moveTo(-13, -82);
    ctx.quadraticCurveTo(-19, -73, -15, -59);
    ctx.quadraticCurveTo(-9, -65, -8, -78);
    ctx.moveTo(12, -83);
    ctx.quadraticCurveTo(18, -72, 14, -58);
    ctx.quadraticCurveTo(8, -65, 8, -78);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    drawRoundRect(ctx, -13, -83, 26, 8, 3, "#111b31", outline);
    ctx.strokeStyle = look.accent;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-9, -79);
    ctx.lineTo(9, -79);
    ctx.stroke();
    ctx.fillStyle = "#8a594e";
    ctx.beginPath();
    ctx.arc(0, -68, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9d5e59";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, -64);
    ctx.quadraticCurveTo(0, -61, 4, -64);
    ctx.stroke();

    ctx.strokeStyle = look.trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -96);
    ctx.lineTo(-4, -99);
    ctx.lineTo(0, -96);
    ctx.lineTo(4, -99);
    ctx.lineTo(8, -96);
    ctx.stroke();
    ctx.fillStyle = look.accent;
    ctx.strokeStyle = look.trim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -101);
    ctx.lineTo(4, -97);
    ctx.lineTo(0, -93);
    ctx.lineTo(-4, -97);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const drawAvatarPortrait = (look) => {
    if (!(avatarPortrait instanceof HTMLCanvasElement)) return;
    const portrait = avatarPortrait.getContext("2d");
    if (!portrait) return;
    portrait.clearRect(0, 0, avatarPortrait.width, avatarPortrait.height);
    portrait.save();
    portrait.translate(56, 109);
    drawNeenAvatar(portrait, look, 0);
    portrait.restore();
  };

  const drawCharacter = (ctx, time, now) => {
    const moving = state.keys.size > 0 || Math.hypot(state.joystickVector.x, state.joystickVector.y) > .08;
    const jumpProgress = state.jumpUntil > now ? 1 - (state.jumpUntil - now) / 560 : 0;
    const jumpHeight = state.jumpUntil > now ? Math.sin(jumpProgress * Math.PI) * 47 : 0;
    const dashActive = state.dashUntil > now;
    const runCycle = moving ? Math.sin(time * 14) : Math.sin(time * 2) * .15;
    const bob = moving ? Math.sin(time * 14) * 2.5 : Math.sin(time * 2) * 2;
    const squashX = state.jumpUntil > now && jumpProgress < .12 ? 1.13 : 1;
    const squashY = state.jumpUntil > now && jumpProgress < .12 ? .82 : 1;
    const look = AVATAR_LOOKS.find((item) => item.id === state.avatarId) || AVATAR_LOOKS[0];
    const x = state.position.x;
    const y = state.position.y - jumpHeight + bob;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgb(37 69 77 / 22%)";
    ctx.beginPath();
    ctx.ellipse(0, 26 + jumpHeight * .42, 29 - jumpHeight * .15, 11 - jumpHeight * .04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(squashX, squashY);
    ctx.scale(state.facing.x < -.15 ? -1 : 1, 1);
    if (dashActive) {
      for (let echo = 3; echo > 0; echo--) {
        ctx.save();
        ctx.globalAlpha = .1 + (4 - echo) * .035;
        ctx.translate(-echo * 15, 25);
        drawNeenAvatar(ctx, look, runCycle);
        ctx.restore();
      }
    }
    ctx.translate(0, 25);
    drawNeenAvatar(ctx, look, runCycle);
    ctx.restore();
  };

  const drawParticles = (ctx, delta) => {
    state.particles = state.particles.filter((particle) => particle.life > 0);
    for (const particle of state.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += 48 * delta;
      particle.life -= delta;
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * Math.max(.25, particle.life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    state.floatingTexts = state.floatingTexts.filter((entry) => entry.life > 0);
    for (const entry of state.floatingTexts) {
      entry.y -= 30 * delta;
      entry.life -= delta;
      ctx.globalAlpha = Math.min(1, entry.life * 1.5);
      ctx.fillStyle = "rgb(40 73 83 / 75%)";
      ctx.font = "800 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.text, entry.x + 2, entry.y + 2);
      ctx.fillStyle = entry.color;
      ctx.fillText(entry.text, entry.x, entry.y);
    }
    ctx.globalAlpha = 1;
  };

  const renderFrame = (now) => {
    const delta = Math.min(.04, Math.max(0, (now - (state.lastFrame || now)) / 1000));
    state.lastFrame = now;
    const time = now / 1000;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / WORLD.viewWidth;
    const scaleY = canvas.height / WORLD.viewHeight;
    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    const cameraX = Math.max(0, Math.min(WORLD.width - WORLD.viewWidth, state.position.x - WORLD.viewWidth / 2));
    const cameraY = Math.max(0, Math.min(WORLD.height - WORLD.viewHeight, state.position.y - WORLD.viewHeight / 2));
    context.save();
    context.clearRect(0, 0, WORLD.viewWidth, WORLD.viewHeight);
    context.translate(-cameraX, -cameraY);
    drawBackground(context, state.position.zone, time);
    drawWorldObjects(context, time);
    drawCharacter(context, time, now);
    drawParticles(context, delta);
    context.restore();

    if (state.toastUntil && now > state.toastUntil) {
      const toastNode = document.querySelector("[data-toast]");
      if (toastNode) toastNode.hidden = true;
      state.toastUntil = 0;
    }

    updateInteraction();
    updateMovement(delta, now);
    updateDashStatus(now);
    if (state.dirty && now - state.lastPeriodicSync > 1800 && state.authenticated && !state.busy) {
      state.lastPeriodicSync = now;
      scheduleProgressSync();
    }
    state.animationFrame = requestAnimationFrame(renderFrame);
  };

  const currentInput = () => {
    let x = state.joystickVector.x;
    let y = state.joystickVector.y;
    if (state.keys.has("ArrowLeft") || state.keys.has("a")) x -= 1;
    if (state.keys.has("ArrowRight") || state.keys.has("d")) x += 1;
    if (state.keys.has("ArrowUp") || state.keys.has("w")) y -= 1;
    if (state.keys.has("ArrowDown") || state.keys.has("s")) y += 1;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    return { x, y };
  };

  const updateMovement = (delta, now) => {
    const input = currentInput();
    const magnitude = Math.hypot(input.x, input.y);
    if (magnitude > .05) {
      state.facing = { x: input.x / magnitude, y: input.y / magnitude };
      const dashing = now < state.dashUntil;
      const speed = dashing ? 585 : 245;
      state.position.x = Math.min(WORLD.width - 35, Math.max(35, state.position.x + input.x * speed * delta));
      state.position.y = Math.min(WORLD.height - 35, Math.max(35, state.position.y + input.y * speed * delta));
      if (Math.random() < delta * 10) {
        spawnBurst(
          state.position.x - state.facing.x * 13,
          state.position.y + 12,
          state.position.zone === "loot_canyon" ? "#f5c084" : "#f7e5a1",
          1,
        );
      }
      state.dirty = true;
    }
  };

  const jump = () => {
    const now = performance.now();
    if (state.jumpUntil > now) return;
    state.jumpUntil = now + 560;
    spawnBurst(state.position.x, state.position.y + 14, "#fff1bd", 7);
  };

  const dash = () => {
    const now = performance.now();
    if (now < state.dashCooldownUntil) {
      const remain = Math.ceil((state.dashCooldownUntil - now) / 1000);
      toast(`Dash recharging · ${remain}s`);
      return;
    }
    state.dashUntil = now + 260;
    state.dashCooldownUntil = now + 2100;
    spawnBurst(state.position.x, state.position.y, "#b5f7f3", 10);
  };

  const updateDashStatus = (now) => {
    if (now - state.lastDashHudUpdate < 180) return;
    state.lastDashHudUpdate = now;
    const node = document.querySelector("[data-dash-status]");
    if (!(node instanceof HTMLElement)) return;
    const remaining = Math.max(0, state.dashCooldownUntil - now);
    node.classList.toggle("is-cooling", remaining > 0);
    node.textContent = remaining > 0 ? `Dash ${Math.ceil(remaining / 1000)}s` : "Dash ready";
  };

  const openCodex = () => {
    renderCodex();
    if (!codexDialog.open) codexDialog.showModal();
  };

  const normalizeKey = (key) => ({
    arrowup: "ArrowUp",
    arrowdown: "ArrowDown",
    arrowleft: "ArrowLeft",
    arrowright: "ArrowRight",
  }[key.toLowerCase()] || key.toLowerCase());

  if (avatarSelect instanceof HTMLSelectElement) {
    avatarSelect.addEventListener("change", () => setAvatar(avatarSelect.value, true));
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") event.preventDefault();
    canvas.focus({ preventScroll: true });
  });
  window.addEventListener("keydown", (event) => {
    if (codexDialog.open && event.key !== "Escape") return;
    if (event.target === avatarSelect) return;
    const key = normalizeKey(event.key);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) event.preventDefault();
    if (key === " " && !event.repeat) {
      if (state.activeInteraction) void interact();
      else jump();
      return;
    }
    if (key === "e" && !event.repeat) {
      void interact();
      return;
    }
    if (key === "shift" && !event.repeat) {
      dash();
      return;
    }
    if (key === "c" && !event.repeat) {
      openCodex();
      return;
    }
    if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      state.keys.add(key);
    }
  });
  window.addEventListener("keyup", (event) => {
    state.keys.delete(normalizeKey(event.key));
  });
  window.addEventListener("blur", () => state.keys.clear());

  const bindPress = (button, action) => {
    if (!(button instanceof HTMLButtonElement)) return;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      action();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (event.detail === 0) action();
    });
  };
  bindPress(actionButton, () => void interact());
  bindPress(touchActionButton, () => void interact());
  bindPress(jumpButton, jump);
  bindPress(dashButton, dash);
  startButton.addEventListener("click", () => void startAdventure());
  completeButton.addEventListener("click", () => void completeAdventure());

  const codexOpenButton = document.querySelector("[data-codex-open]");
  const codexCloseButton = document.querySelector("[data-codex-close]");
  codexOpenButton?.addEventListener("click", openCodex);
  codexCloseButton?.addEventListener("click", () => codexDialog.close());
  codexDialog.addEventListener("click", (event) => {
    if (event.target === codexDialog) codexDialog.close();
  });
  mapToggle.addEventListener("click", () => {
    const expanded = minimap.classList.toggle("is-expanded");
    mapToggle.setAttribute("aria-expanded", String(expanded));
    mapToggle.textContent = expanded ? "Close" : "Expand";
  });

  if (joystick instanceof HTMLElement && joystickKnob instanceof HTMLElement) {
    const moveJoystick = (event) => {
      const rect = joystick.getBoundingClientRect();
      const radius = rect.width * .39;
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.min(radius, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const x = (Math.cos(angle) * distance) / radius;
      const y = (Math.sin(angle) * distance) / radius;
      state.joystickVector = { x, y };
      joystickKnob.style.left = `calc(50% + ${x * radius}px)`;
      joystickKnob.style.top = `calc(50% + ${y * radius}px)`;
    };
    joystick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      state.joystickPointer = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      moveJoystick(event);
    });
    joystick.addEventListener("pointermove", (event) => {
      if (state.joystickPointer === event.pointerId) {
        event.preventDefault();
        moveJoystick(event);
      }
    });
    const releaseJoystick = (event) => {
      if (state.joystickPointer !== event.pointerId) return;
      state.joystickPointer = null;
      state.joystickVector = { x: 0, y: 0 };
      joystickKnob.style.left = "50%";
      joystickKnob.style.top = "50%";
    };
    joystick.addEventListener("pointerup", releaseJoystick);
    joystick.addEventListener("pointercancel", releaseJoystick);
    joystick.addEventListener("lostpointercapture", releaseJoystick);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(state.animationFrame);
      state.keys.clear();
      if (state.dirty) scheduleProgressSync(true);
    } else {
      state.lastFrame = 0;
      state.animationFrame = requestAnimationFrame(renderFrame);
    }
  });
  const resizeObserver = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
  });
  resizeObserver.observe(canvas);

  const initialCatalog = [
    { id: "golden_compass", name: "Golden Compass", image: "/assets/hero-loot/gold-coin.webp" },
    { id: "neon_relic", name: "Neon Relic", image: "/assets/hero-loot/weapon-ak47.webp" },
    { id: "drift_token", name: "Drift Token", image: "/assets/hero-loot/weapon-mp40.webp" },
    { id: "sun_crate", name: "Sun Crate", image: "/assets/hero-loot/loot-crate.webp" },
    { id: "palm_pack", name: "Palm Pack", image: "/assets/hero-loot/backpack.webp" },
    { id: "snoop_badge", name: "Snoop Badge", image: "/assets/hero-loot/snoop-sticker-01.webp" },
    { id: "reef_sticker", name: "Reef Sticker", image: "/assets/hero-loot/snoop-sticker-02.webp" },
    { id: "sunset_sticker", name: "Sunset Sticker", image: "/assets/hero-loot/snoop-sticker-03.webp" },
    { id: "canyon_sticker", name: "Canyon Sticker", image: "/assets/hero-loot/snoop-sticker-04.webp" },
  ];
  state.codex = initialCatalog;
  setAvatar(state.avatarId);
  loadImages(initialCatalog);
  renderProgress();
  renderMap();
  state.animationFrame = requestAnimationFrame(renderFrame);
  void loadState();
})();
