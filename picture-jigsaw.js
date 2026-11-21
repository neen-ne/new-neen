(() => {
  const BOARD_SIZE = 4;
  const PIECE_COUNT = BOARD_SIZE * BOARD_SIZE;

  const picker = document.querySelector("[data-jigsaw-picker]");
  const options = document.querySelector("[data-jigsaw-options]");
  const startButton = document.querySelector("[data-jigsaw-start]");
  const boardView = document.querySelector("[data-jigsaw-view]");
  const board = document.querySelector("[data-jigsaw-board]");
  const status = document.querySelector("[data-jigsaw-status]");
  const signIn = document.querySelector("[data-jigsaw-signin]");
  const attempts = document.querySelector("[data-jigsaw-attempts]");
  const progress = document.querySelector("[data-jigsaw-progress]");
  const imageTitle = document.querySelector("[data-jigsaw-image-title]");
  const hint = document.querySelector("[data-jigsaw-hint]");
  const completePanel = document.querySelector("[data-jigsaw-complete]");
  const rewardMessage = document.querySelector("[data-jigsaw-reward]");
  const totalCoins = document.querySelector("[data-jigsaw-total-coins]");
  const earnedCoins = document.querySelector("[data-jigsaw-earned-coins]");
  const playAgainButton = document.querySelector("[data-jigsaw-again]");
  const chooseButton = document.querySelector("[data-jigsaw-choose]");
  const startLabel = startButton ? startButton.querySelector("span") : null;

  const FALLBACK_IMAGES = [
    {
      id: "neen-jigsaw-1",
      alt: "NEEN Original #1",
      src: "assets/Picture%20Jigsaw%20pic/WhatsApp%20Image%202026-11-07%20at%208.32.06%20PM.webp",
      width: 1080,
      height: 1080,
    },
    {
      id: "neen-jigsaw-2",
      alt: "NEEN Original #2",
      src: "assets/Picture%20Jigsaw%20pic/WhatsApp%20Image%202026-11-07%20at%208.32.37%20PM.webp",
      width: 1080,
      height: 1080,
    },
    {
      id: "neen-jigsaw-3",
      alt: "NEEN Original #3",
      src: "assets/Picture%20Jigsaw%20pic/WhatsApp%20Image%202026-11-07%20at%208.32.06%20PM.webp",
      width: 1080,
      height: 1080,
    },
  ];

  let csrfToken = "";
  let game = { images: FALLBACK_IMAGES };
  let selectedImage = null;
  let currentSession = null;
  let pendingStartKey = "";
  let busy = false;
  let offlineMode = false;
  let activePointerIndex = null;
  let keyboardSelection = null;
  const imageChoices = new Map();
  const tiles = new Map();

  const isPermutationSolved = (perm) =>
    Array.isArray(perm) && perm.length > 0 && perm.every((piece, idx) => Number(piece) === idx);

  const normalizeSession = (session, fallbackImage = selectedImage) => {
    const boardSize = BOARD_SIZE;
    const pieceCount = PIECE_COUNT;
    let perm = Array.isArray(session?.permutation) ? session.permutation.map(Number) : [];
    if (perm.length !== pieceCount) {
      perm = shuffledPermutation(boardSize);
    }
    const solved = session?.status === "completed" || isPermutationSolved(perm);
    return {
      ...session,
      image: session?.image || fallbackImage,
      board_size: boardSize,
      piece_count: pieceCount,
      permutation: perm,
      move_count: Number(session?.move_count || 0),
      status: solved ? "completed" : (session?.status || "in_progress"),
    };
  };

  const api = async (path, method = "GET", data = null) => {
    const request = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (data !== null) {
      request.headers["Content-Type"] = "application/json";
      if (csrfToken) request.headers["X-CSRF-Token"] = csrfToken;
      request.body = JSON.stringify(data);
    }

    const response = await fetch(`/api/${path}`, request);
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The game service returned an invalid response.");
    }
    if (!response.ok || !result.success) {
      const error = new Error(result.errors?.[0]?.message || "The game request could not be completed.");
      error.code = result.errors?.[0]?.code;
      error.status = response.status;
      throw error;
    }
    return result.data;
  };

  const element = (tagName, className, text) => {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const setStatus = (text, isError = false) => {
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  };

  const updateWallet = (wallet) => {
    if (!wallet || !totalCoins || !earnedCoins) return;
    if (wallet.coin_balance !== undefined) totalCoins.textContent = String(wallet.coin_balance);
    if (wallet.earned_coin_balance !== undefined) earnedCoins.textContent = String(wallet.earned_coin_balance);
  };

  const refreshWallet = async () => {
    if (!totalCoins || !earnedCoins) return;
    try {
      updateWallet(await api("wallet"));
    } catch {
      if (totalCoins.textContent === "--") totalCoins.textContent = "0";
      if (earnedCoins.textContent === "--") earnedCoins.textContent = "0";
    }
  };

  const shuffledPermutation = (size) => {
    const count = size * size;
    const arr = Array.from({ length: count }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (isPermutationSolved(arr) && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    return arr;
  };

  const createLocalSession = (image) => ({
    id: "local-" + Date.now(),
    image,
    board_size: BOARD_SIZE,
    piece_count: PIECE_COUNT,
    permutation: shuffledPermutation(BOARD_SIZE),
    move_count: 0,
    status: "in_progress",
    _local: true,
  });

  const showPicker = () => {
    if (picker) picker.hidden = false;
    if (boardView) boardView.hidden = true;
    if (completePanel) completePanel.hidden = true;
    currentSession = null;
    tiles.clear();
    if (board) board.replaceChildren();
    updateControls();
  };

  const updateControls = () => {
    const sessionActive = currentSession
      && ["started", "in_progress"].includes(currentSession.status);
    if (startButton) {
      startButton.disabled = busy || !selectedImage;
      if (startLabel) {
        startLabel.textContent = sessionActive ? "Resume this picture" : "Start this picture";
      }
    }
    if (playAgainButton) playAgainButton.disabled = busy;
    if (chooseButton) chooseButton.disabled = busy;
    tiles.forEach((tile, position) => {
      const locked = busy || !sessionActive;
      tile.disabled = locked;
      const perm = currentSession?.permutation || [];
      const pieceNum = Number(perm[position] ?? position) + 1;
      const isRight = Number(perm[position]) === position;
      tile.setAttribute(
        "aria-label",
        `Piece ${pieceNum}, position ${position + 1}${isRight ? ", correct" : ""}`
      );
    });
    imageChoices.forEach((button, imageId) => {
      button.disabled = busy;
      button.setAttribute("aria-pressed", String(selectedImage?.id === imageId));
    });
  };

  const buildImagePicker = () => {
    if (!options) return;
    options.replaceChildren();
    imageChoices.clear();
    const list = Array.isArray(game?.images) && game.images.length ? game.images : FALLBACK_IMAGES;

    list.forEach((image, idx) => {
      const button = element("button", "jigsaw-image-option");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");

      const preview = document.createElement("img");
      preview.src = image.src;
      preview.alt = image.alt || `Picture ${idx + 1}`;
      if (image.width) preview.width = image.width;
      if (image.height) preview.height = image.height;
      preview.loading = "eager";
      preview.decoding = "async";

      preview.addEventListener("error", () => {
        const fallbackSrc = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length].src;
        if (!preview.dataset.retried) {
          preview.dataset.retried = "1";
          image.src = fallbackSrc;
          preview.src = fallbackSrc;
        }
      });

      button.append(preview, element("span", "", image.alt || `Picture ${idx + 1}`));

      button.addEventListener("click", () => {
        selectedImage = image;
        imageChoices.forEach((choice, id) => {
          choice.classList.toggle("is-selected", id === image.id);
          choice.setAttribute("aria-pressed", String(id === image.id));
        });
        updateControls();
        void startGame(image);
      });

      imageChoices.set(image.id, button);
      options.append(button);
    });
  };


  const revealCompletionBanner = (session, reward = null) => {
    const perm = session?.permutation || [];
    const correctCount = perm.reduce((acc, val, idx) => acc + Number(Number(val) === idx), 0);
    const total = session?.piece_count || perm.length || 16;
    const done = session?.status === "completed" || (total > 0 && correctCount === total);
    if (!done) return;

    if (progress) progress.textContent = `${total} / ${total}`;
    if (completePanel) {
      completePanel.hidden = false;
      completePanel.removeAttribute("hidden");
      completePanel.style.setProperty("display", "block", "important");
      completePanel.style.setProperty("visibility", "visible", "important");
      completePanel.style.setProperty("opacity", "1", "important");
    }
    if (rewardMessage) {
      rewardMessage.hidden = false;
      rewardMessage.removeAttribute("hidden");
      rewardMessage.style.setProperty("display", "block", "important");
      if (reward) {
        updateWallet({
          coin_balance: reward.coin_balance,
          earned_coin_balance: reward.earned_coin_balance,
        });
        rewardMessage.textContent = `+${reward.amount} Earned Coins credited. Earned balance: ${reward.earned_coin_balance}; total balance: ${reward.coin_balance}.`;
      } else if (!rewardMessage.textContent.trim()) {
        const curTotal = totalCoins?.textContent?.trim() || "0";
        const curEarned = earnedCoins?.textContent?.trim() || "0";
        rewardMessage.textContent = `Picture completed! Earned balance: ${curEarned} · Total balance: ${curTotal}.`;
      }
    }
    if (playAgainButton) {
      playAgainButton.hidden = false;
      playAgainButton.removeAttribute("hidden");
      playAgainButton.style.setProperty("display", "inline-flex", "important");
    }
    if (chooseButton) {
      chooseButton.hidden = false;
      chooseButton.removeAttribute("hidden");
      chooseButton.style.setProperty("display", "inline-flex", "important");
    }
  };

  const buildBoard = (rawSession, reward = null) => {
    const session = normalizeSession(rawSession);
    currentSession = session;
    selectedImage = session.image;

    if (picker) picker.hidden = true;
    if (boardView) boardView.hidden = false;
    if (!board) return;

    const gridSize = session.board_size || BOARD_SIZE;
    const stepPct = gridSize > 1 ? 100 / (gridSize - 1) : 0;

    board.replaceChildren();
    tiles.clear();
    keyboardSelection = null;
    board.style.setProperty("--jigsaw-grid-size", String(gridSize));
    board.style.setProperty("--jigsaw-image", `url("${session.image.src}")`);
    const aspect = session.image.width && session.image.height
      ? session.image.width / session.image.height
      : 1;
    board.style.setProperty("--jigsaw-aspect", String(aspect));
    if (imageTitle) imageTitle.textContent = session.image.alt || "Picture Puzzle";

    session.permutation.forEach((pieceIndex, position) => {
      const piece = element("button", "jigsaw-piece");
      const column = pieceIndex % gridSize;
      const row = Math.floor(pieceIndex / gridSize);
      piece.type = "button";
      piece.dataset.position = String(position);
      piece.style.setProperty("--piece-column", String(column));
      piece.style.setProperty("--piece-row", String(row));
      piece.style.setProperty("--piece-x", `${column * stepPct}%`);
      piece.style.setProperty("--piece-y", `${row * stepPct}%`);
      if (pieceIndex === position) piece.classList.add("is-correct");

      piece.addEventListener("pointerdown", (event) => {
        if (busy || event.button !== 0 || !["started", "in_progress"].includes(currentSession?.status)) return;
        event.preventDefault();
        activePointerIndex = position;
        piece.classList.add("is-dragging");
      });

      piece.addEventListener("click", (event) => {
        if (event.detail !== 0 || busy) return;
        if (keyboardSelection === null) {
          keyboardSelection = position;
          piece.classList.add("is-selected");
          if (hint) hint.textContent = `Piece ${pieceIndex + 1} selected. Select its destination piece.`;
          return;
        }
        const from = keyboardSelection;
        tiles.get(from)?.classList.remove("is-selected");
        keyboardSelection = null;
        if (from !== position) void swap(from, position);
      });

      board.append(piece);
      tiles.set(position, piece);
    });

    const correctCount = session.permutation.reduce(
      (count, pieceIndex, position) => count + Number(pieceIndex === position),
      0,
    );
    const isCompleted = session.status === "completed" || correctCount === session.piece_count;
    if (progress) progress.textContent = `${correctCount} / ${session.piece_count}`;

    if (completePanel) {
      completePanel.hidden = !isCompleted;
      completePanel.style.display = isCompleted ? "" : "none";
    }
    if (rewardMessage) {
      rewardMessage.hidden = !reward;
      if (reward) {
        updateWallet({
          coin_balance: reward.coin_balance,
          earned_coin_balance: reward.earned_coin_balance,
        });
        rewardMessage.textContent = `+${reward.amount} Earned Coins credited. Earned balance: ${reward.earned_coin_balance}; total balance: ${reward.coin_balance}.`;
      } else if (isCompleted) {
        rewardMessage.hidden = false;
        rewardMessage.textContent = `Picture completed in ${session.move_count} moves! Choose "Play again" or "Choose another picture".`;
      }
    }
    if (playAgainButton) {
      playAgainButton.hidden = !isCompleted;
      playAgainButton.style.display = isCompleted ? "" : "none";
    }
    if (chooseButton) chooseButton.hidden = false;
    if (hint) {
      hint.textContent = isCompleted
        ? "Completed! Every one of the 16 pieces is in its place."
        : "Drag one piece onto another to swap them. On a keyboard, select a piece, then select its destination.";
    }
    board.setAttribute("aria-busy", "false");
    updateControls();
    revealCompletionBanner(session, reward);
  };

  const swap = async (fromIndex, toIndex) => {
    if (
      busy
      || !Number.isInteger(fromIndex)
      || !Number.isInteger(toIndex)
      || fromIndex === toIndex
      || !currentSession
      || !["started", "in_progress"].includes(currentSession.status)
    ) {
      return;
    }
    busy = true;
    updateControls();
    setStatus("Saving your move…");

    const applyLocalSwap = (reasonMsg = "") => {
      const nextPerm = [...currentSession.permutation];
      [nextPerm[fromIndex], nextPerm[toIndex]] = [nextPerm[toIndex], nextPerm[fromIndex]];
      const solved = isPermutationSolved(nextPerm);
      currentSession = {
        ...currentSession,
        permutation: nextPerm,
        move_count: (currentSession.move_count || 0) + 1,
        status: solved ? "completed" : "in_progress",
        _local: true,
      };
      busy = false;
      buildBoard(currentSession);
      if (solved) {
        setStatus("Picture completed! All 16 pieces are in place.");
      } else {
        setStatus(
          reasonMsg || `${progress?.textContent || ""} pieces in the correct position · ${currentSession.move_count} moves`
        );
      }
    };

    if (currentSession._local || offlineMode) {
      applyLocalSwap();
      return;
    }

    try {
      const data = await api(
        `games/picture-jigsaw/sessions/${currentSession.id}/swap`,
        "POST",
        { from_index: fromIndex, to_index: toIndex },
      );
      currentSession = normalizeSession(data.session, currentSession.image);
      busy = false;
      buildBoard(currentSession, data.reward || null);
      if (currentSession.status === "completed") {
        setStatus(data.reward
          ? `You won: ${data.reward.amount} Earned Coins were credited by the server.`
          : "Picture completed! Every piece is in place.");
      } else {
        setStatus(`${progress?.textContent || ""} pieces in the correct position · ${currentSession.move_count} moves`);
      }
    } catch (error) {
      applyLocalSwap(error.message || "");
    } finally {
      busy = false;
      updateControls();
    }
  };

  const startGame = async (image = selectedImage) => {
    if (!image) return;
    selectedImage = image;
    if (busy) return;
    busy = true;
    if (startButton) startButton.setAttribute("aria-busy", "true");
    updateControls();
    setStatus("Opening your 16-piece puzzle…");

    if (offlineMode) {
      busy = false;
      if (startButton) startButton.removeAttribute("aria-busy");
      buildBoard(createLocalSession(image));
      setStatus("Your 16-piece picture is ready. Swap pieces to rebuild the original.");
      return;
    }

    if (!pendingStartKey) pendingStartKey = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    try {
      const data = await api("games/picture-jigsaw/sessions", "POST", {
        image_id: image.id,
        idempotency_key: pendingStartKey,
      });
      pendingStartKey = "";
      if (attempts && data.attempts_remaining_today !== undefined) {
        attempts.textContent = String(data.attempts_remaining_today);
      }
      if (signIn) signIn.hidden = true;
      const normalized = normalizeSession(data.session, image);
      busy = false;
      buildBoard(normalized);
      setStatus(
        normalized.status === "completed"
          ? "This picture is already complete."
          : data.created
            ? "Your 16-piece picture is ready. Swap pieces to rebuild the original."
            : "Resumed your saved picture."
      );
    } catch (error) {
      offlineMode = true;
      if (error.status === 401 && signIn) signIn.hidden = false;
      busy = false;
      buildBoard(createLocalSession(image));
      setStatus("Picture opened! Swap the 16 pieces to rebuild the original.");
    } finally {
      busy = false;
      if (startButton) startButton.removeAttribute("aria-busy");
      updateControls();
    }
  };

  if (startButton) startButton.addEventListener("click", () => void startGame());
  if (playAgainButton) playAgainButton.addEventListener("click", () => void startGame(currentSession?.image || selectedImage));
  if (chooseButton) {
    chooseButton.addEventListener("click", async () => {
      if (busy || !currentSession) return;
      if (!currentSession._local && !offlineMode && ["started", "in_progress"].includes(currentSession.status)) {
        try {
          await api(`games/picture-jigsaw/sessions/${currentSession.id}/abandon`, "POST", {});
        } catch {
          // ignore
        }
      }
      busy = false;
      setStatus("Choose another original picture to begin.");
      showPicker();
    });
  }

  window.addEventListener("pointerup", (event) => {
    if (activePointerIndex === null) return;
    const from = activePointerIndex;
    activePointerIndex = null;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-position]");
    tiles.get(from)?.classList.remove("is-dragging");
    if (target && board && board.contains(target)) {
      void swap(from, Number(target.dataset.position));
    } else {
      updateControls();
    }
  });

  window.addEventListener("pointercancel", () => {
    if (activePointerIndex === null) return;
    tiles.get(activePointerIndex)?.classList.remove("is-dragging");
    activePointerIndex = null;
    updateControls();
  });

  const initialize = async () => {
    if (picker) picker.hidden = false;
    if (board) board.setAttribute("aria-busy", "false");
    busy = false;

    try {
      const [catalog, csrf] = await Promise.all([
        api("games/picture-jigsaw"),
        api("auth/csrf"),
      ]);
      if (catalog?.game?.images?.length) game = catalog.game;
      if (csrf?.csrf_token) csrfToken = csrf.csrf_token;
      buildImagePicker();
      if (picker) picker.hidden = false;
      updateControls();

      try {
        const current = await api("games/picture-jigsaw/sessions/current");
        if (attempts && current.attempts_remaining_today !== undefined) {
          attempts.textContent = String(current.attempts_remaining_today);
        }
        busy = false;
        updateControls();
        if (current.session) {
          const normalized = normalizeSession(current.session);
          buildBoard(normalized);
          setStatus(normalized.status === "completed"
            ? "This completed picture is saved."
            : "Resumed your saved picture.");
        } else {
          setStatus("Choose one of the pictures to start the 16-piece puzzle.");
        }
        await refreshWallet();
      } catch (error) {
        if (error.status === 401 && signIn) signIn.hidden = false;
        busy = false;
        updateControls();
        setStatus("Choose a picture to open the 16-piece puzzle.");
      }
    } catch {
      offlineMode = true;
      game = { images: FALLBACK_IMAGES };
      buildImagePicker();
      if (picker) picker.hidden = false;
      if (attempts && attempts.textContent === "--") attempts.textContent = "3";
      if (totalCoins && totalCoins.textContent === "--") totalCoins.textContent = "0";
      if (earnedCoins && earnedCoins.textContent === "--") earnedCoins.textContent = "0";
      busy = false;
      updateControls();
      setStatus("Choose one of the pictures to start the 16-piece puzzle.");
    }
  };

  void initialize();
})();
