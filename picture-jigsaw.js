(() => {
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
  const startLabel = startButton.querySelector("span");

  let csrfToken = "";
  let game = null;
  let selectedImage = null;
  let currentSession = null;
  let pendingStartKey = "";
  let busy = true;
  let activePointerIndex = null;
  let keyboardSelection = null;
  const imageChoices = new Map();
  const tiles = new Map();

  const api = async (path, method = "GET", data = null) => {
    const request = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (data !== null) {
      request.headers["Content-Type"] = "application/json";
      request.headers["X-CSRF-Token"] = csrfToken;
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
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  };

  const updateWallet = (wallet) => {
    totalCoins.textContent = String(wallet.coin_balance);
    earnedCoins.textContent = String(wallet.earned_coin_balance);
  };

  const refreshWallet = async () => {
    try {
      updateWallet(await api("wallet"));
    } catch (error) {
      totalCoins.textContent = "Unavailable";
      earnedCoins.textContent = "Unavailable";
      totalCoins.title = error.message;
      earnedCoins.title = error.message;
    }
  };

  const showPicker = () => {
    picker.hidden = false;
    boardView.hidden = true;
    currentSession = null;
    tiles.clear();
    board.replaceChildren();
    updateControls();
  };

  const updateControls = () => {
    const sessionActive = currentSession
      && ["started", "in_progress"].includes(currentSession.status);
    startButton.disabled = busy || !selectedImage;
    startLabel.textContent = sessionActive ? "Resume this picture" : "Start this picture";
    playAgainButton.disabled = busy;
    chooseButton.disabled = busy;
    tiles.forEach((tile, position) => {
      const locked = busy || !sessionActive;
      tile.disabled = locked;
      tile.setAttribute("aria-label", `Piece ${currentSession.permutation[position] + 1}, position ${position + 1}${currentSession.permutation[position] === position ? ", correct" : ""}`);
    });
    imageChoices.forEach((button, imageId) => {
      button.disabled = busy;
      button.setAttribute("aria-pressed", String(selectedImage?.id === imageId));
    });
  };

  const buildImagePicker = () => {
    options.replaceChildren();
    imageChoices.clear();
    game.images.forEach((image) => {
      const button = element("button", "jigsaw-image-option");
      button.type = "button";
      button.setAttribute("aria-pressed", "false");
      const preview = document.createElement("img");
      preview.src = image.src;
      preview.alt = image.alt;
      preview.width = image.width;
      preview.height = image.height;
      preview.loading = "lazy";
      preview.decoding = "async";
      preview.addEventListener("error", () => {
        button.disabled = true;
        button.setAttribute("aria-label", `${image.alt}, image unavailable`);
      }, { once: true });
      button.append(preview, element("span", "", image.alt));
      button.addEventListener("click", () => {
        selectedImage = image;
        imageChoices.forEach((choice, id) => {
          choice.classList.toggle("is-selected", id === image.id);
          choice.setAttribute("aria-pressed", String(id === image.id));
        });
        startButton.disabled = busy;
        setStatus(`Selected: ${image.alt}`);
      });
      imageChoices.set(image.id, button);
      options.append(button);
    });
  };

  const buildBoard = (session, reward = null) => {
    currentSession = session;
    selectedImage = session.image;
    picker.hidden = true;
    boardView.hidden = false;
    board.replaceChildren();
    tiles.clear();
    keyboardSelection = null;
    board.style.setProperty("--jigsaw-image", `url("${session.image.src}")`);
    board.style.setProperty("--jigsaw-aspect", String(session.image.width / session.image.height));
    imageTitle.textContent = session.image.alt;

    session.permutation.forEach((pieceIndex, position) => {
      const piece = element("button", "jigsaw-piece");
      const column = pieceIndex % session.board_size;
      const row = Math.floor(pieceIndex / session.board_size);
      piece.type = "button";
      piece.dataset.position = String(position);
      piece.style.setProperty("--piece-column", String(column));
      piece.style.setProperty("--piece-row", String(row));
      piece.style.setProperty("--piece-x", `${column * 50}%`);
      piece.style.setProperty("--piece-y", `${row * 50}%`);
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
          hint.textContent = `Piece ${pieceIndex + 1} selected. Select its destination piece.`;
          return;
        }
        const from = keyboardSelection;
        tiles.get(from)?.classList.remove("is-selected");
        keyboardSelection = null;
        if (from !== position) swap(from, position);
      });
      board.append(piece);
      tiles.set(position, piece);
    });

    const correctCount = session.permutation.reduce(
      (count, pieceIndex, position) => count + Number(pieceIndex === position),
      0,
    );
    progress.textContent = `${correctCount} / ${session.piece_count}`;
    completePanel.hidden = session.status !== "completed";
    rewardMessage.hidden = !reward;
    if (reward) {
      updateWallet({
        coin_balance: reward.coin_balance,
        earned_coin_balance: reward.earned_coin_balance,
      });
      rewardMessage.textContent = `+${reward.amount} Earned Coins credited. Earned balance: ${reward.earned_coin_balance}; total balance: ${reward.coin_balance}.`;
    }
    playAgainButton.hidden = session.status !== "completed";
    chooseButton.hidden = false;
    hint.textContent = session.status === "completed"
      ? "Every piece is in its correct place."
      : "Drag one piece onto another to swap them. On a keyboard, select a piece, then select its destination.";
    board.setAttribute("aria-busy", "false");
    updateControls();
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
    try {
      const data = await api(
        `games/picture-jigsaw/sessions/${currentSession.id}/swap`,
        "POST",
        { from_index: fromIndex, to_index: toIndex },
      );
      currentSession = data.session;
      buildBoard(currentSession, data.reward || null);
      if (currentSession.status === "completed") {
        setStatus(data.reward
          ? `You won: ${data.reward.amount} Earned Coins were credited by the server.`
          : "The server confirmed every piece is in place. Loading this completed session does not grant another reward.");
      } else {
        setStatus(`${progress.textContent} pieces in the correct position · ${currentSession.move_count} moves`);
      }
    } catch (error) {
      setStatus(error.message, true);
      if (error.status === 401) signIn.hidden = false;
      try {
        const fresh = await api(`games/picture-jigsaw/sessions/${currentSession.id}`);
        buildBoard(fresh.session);
        if (fresh.session.status === "completed") await refreshWallet();
      } catch {
        busy = false;
        updateControls();
      }
    } finally {
      busy = false;
      updateControls();
    }
  };

  const startGame = async (image = selectedImage) => {
    if (!image || busy) return;
    busy = true;
    startButton.setAttribute("aria-busy", "true");
    updateControls();
    if (!pendingStartKey) pendingStartKey = crypto.randomUUID();
    try {
      const data = await api("games/picture-jigsaw/sessions", "POST", {
        image_id: image.id,
        idempotency_key: pendingStartKey,
      });
      pendingStartKey = "";
      attempts.textContent = String(data.attempts_remaining_today);
      signIn.hidden = true;
      busy = false;
      buildBoard(data.session);
      if (data.session.status === "completed") {
        setStatus("This picture is already complete.");
      } else if (data.created) {
        setStatus("Your picture is ready. Swap pieces to rebuild the original.");
      } else {
        setStatus("Resumed your saved server-side picture.");
      }
    } catch (error) {
      setStatus(error.message, true);
      if (error.status === 401) signIn.hidden = false;
      busy = false;
      updateControls();
    } finally {
      startButton.removeAttribute("aria-busy");
    }
  };

  startButton.addEventListener("click", () => startGame());
  playAgainButton.addEventListener("click", () => startGame(currentSession?.image));
  chooseButton.addEventListener("click", async () => {
    if (busy || !currentSession) return;
    if (["started", "in_progress"].includes(currentSession.status)) {
      if (!window.confirm("Leave this picture? The started attempt will still count toward today's free starts.")) return;
      busy = true;
      updateControls();
      try {
        await api(`games/picture-jigsaw/sessions/${currentSession.id}/abandon`, "POST", {});
      } catch (error) {
        setStatus(error.message, true);
        busy = false;
        updateControls();
        return;
      }
    }
    busy = false;
    setStatus("Choose another original picture to begin.");
    showPicker();
  });

  window.addEventListener("pointerup", (event) => {
    if (activePointerIndex === null) return;
    const from = activePointerIndex;
    activePointerIndex = null;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-position]");
    tiles.get(from)?.classList.remove("is-dragging");
    if (target && board.contains(target)) {
      swap(from, Number(target.dataset.position));
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
    try {
      const [catalog, csrf] = await Promise.all([
        api("games/picture-jigsaw"),
        api("auth/csrf"),
      ]);
      game = catalog.game;
      csrfToken = csrf.csrf_token;
      buildImagePicker();
      picker.hidden = false;
      board.setAttribute("aria-busy", "false");

      try {
        const current = await api("games/picture-jigsaw/sessions/current");
        attempts.textContent = String(current.attempts_remaining_today);
        busy = false;
        updateControls();
        if (current.session) {
          buildBoard(current.session);
          setStatus(current.session.status === "completed"
            ? "This completed server-side picture is saved. Reloading it does not grant another reward."
            : "Resumed your saved server-side picture.");
        } else {
          setStatus("Choose one of the three pictures to get started.");
        }
        await refreshWallet();
      } catch (error) {
        if (error.status !== 401) throw error;
        busy = false;
        signIn.hidden = false;
        updateControls();
        setStatus("Choose a picture; sign in to save and start your game.");
      }
    } catch (error) {
      busy = false;
      updateControls();
      setStatus(error.message, true);
    }
  };

  initialize();
})();
