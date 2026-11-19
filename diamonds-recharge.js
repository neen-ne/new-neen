(() => {
  const form = document.querySelector("[data-diamond-order-form]");
  const packageSelect = document.querySelector("[data-diamond-package]");
  const packageStatus = document.querySelector("[data-diamond-package-status]");
  const playerInput = document.querySelector("#player-id");
  const review = document.querySelector("[data-diamond-review]");
  const confirmation = document.querySelector("[data-diamond-confirmation]");
  const orders = document.querySelector("[data-diamond-orders]");
  const accountMessage = document.querySelector("[data-diamond-account-message]");
  const loginLink = document.querySelector("[data-diamond-login]");
  if (
    !(form instanceof HTMLFormElement)
    || !(packageSelect instanceof HTMLSelectElement)
    || !(packageStatus instanceof HTMLElement)
    || !(playerInput instanceof HTMLInputElement)
    || !(review instanceof HTMLElement)
    || !(confirmation instanceof HTMLElement)
    || !(orders instanceof HTMLElement)
    || !(accountMessage instanceof HTMLElement)
  ) return;

  const errorMessage = form.querySelector("[data-diamond-error]");
  const reviewError = review.querySelector("[data-diamond-review-error]");
  const submitButton = review.querySelector("[data-diamond-submit]");
  const selectedSummary = {
    package: review.querySelector("[data-diamond-review-package]"),
    amount: review.querySelector("[data-diamond-review-amount]"),
    price: review.querySelector("[data-diamond-review-price]"),
    player: review.querySelector("[data-diamond-review-player]"),
  };
  if (
    !(errorMessage instanceof HTMLElement)
    || !(reviewError instanceof HTMLElement)
    || !(submitButton instanceof HTMLButtonElement)
    || Object.values(selectedSummary).some((element) => !(element instanceof HTMLElement))
  ) return;

  let packages = [];
  let pendingIdempotencyKey = null;
  let isSignedIn = false;
  let requestInFlight = false;

  const request = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The recharge service returned an unreadable response.");
    }
    if (!response.ok || result.success !== true) {
      const error = result.errors?.[0];
      const failure = new Error(
        typeof error?.message === "string" ? error.message : `Request failed (${response.status}).`,
      );
      failure.code = typeof error?.code === "string" ? error.code : "";
      failure.status = response.status;
      throw failure;
    }
    return result.data;
  };

  const setError = (element, text) => {
    element.textContent = text;
    element.hidden = false;
  };

  const clearError = (element) => {
    element.textContent = "";
    element.hidden = true;
  };

  const selectedPackage = () => packages.find((item) => String(item.id) === packageSelect.value);

  const loadPackages = async () => {
    const { packages: activePackages } = await request("/api/diamonds/packages");
    if (!Array.isArray(activePackages)) throw new Error("The server package catalog is invalid.");
    packages = activePackages;
    packageSelect.replaceChildren(new Option("Select a package", ""));
    for (const item of packages) {
      const label = `${item.name} · ${item.diamond_amount} Diamonds · ${item.price} ${item.currency_code}`;
      packageSelect.add(new Option(label, String(item.id)));
    }
    packageSelect.disabled = packages.length === 0;
    packageStatus.textContent = packages.length === 0
      ? "No active diamond packages are available."
      : `${packages.length} active server-configured package${packages.length === 1 ? "" : "s"}.`;
    form.querySelector('button[type="submit"]').disabled = packages.length === 0;
  };

  const renderOrders = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      orders.replaceChildren(Object.assign(document.createElement("p"), {
        className: "admin-state",
        textContent: "No recharge requests are recorded for this account.",
      }));
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const order of items) {
      const card = document.createElement("article");
      card.className = "diamond-order-card";
      const heading = document.createElement("div");
      heading.className = "diamond-order-heading";
      const number = document.createElement("strong");
      number.textContent = order.order_number;
      const status = document.createElement("span");
      status.className = "admin-status-pill";
      status.textContent = order.order_status.replaceAll("_", " ");
      heading.append(number, status);
      const detail = document.createElement("p");
      detail.textContent = `${order.package_name} · ${order.diamond_amount} Diamonds · ${order.price} ${order.currency_code} · Player ID ${order.player_id}`;
      const states = document.createElement("small");
      states.textContent = `Payment: ${order.payment_status.replaceAll("_", " ")} · Delivery: ${order.delivery_status.replaceAll("_", " ")}`;
      card.append(heading, detail, states);
      fragment.append(card);
    }
    orders.replaceChildren(fragment);
  };

  const loadOrders = async () => {
    try {
      const { orders: accountOrders } = await request("/api/diamonds/orders");
      isSignedIn = true;
      accountMessage.textContent = "Your account-bound recharge requests and current statuses.";
      if (loginLink instanceof HTMLAnchorElement) loginLink.hidden = true;
      renderOrders(accountOrders);
      form.querySelector('button[type="submit"]').disabled = packages.length === 0;
    } catch (error) {
      if (error?.code === "AUTH_REQUIRED") {
        isSignedIn = false;
        accountMessage.textContent = "Sign in to submit and track a recharge request.";
        if (loginLink instanceof HTMLAnchorElement) loginLink.hidden = false;
        orders.replaceChildren();
        form.querySelector('button[type="submit"]').disabled = true;
        return;
      }
      orders.replaceChildren(Object.assign(document.createElement("p"), {
        className: "admin-state is-error",
        textContent: error instanceof Error ? error.message : "Recharge orders could not be loaded.",
      }));
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearError(errorMessage);
    if (!form.reportValidity()) return;
    if (!isSignedIn) {
      setError(errorMessage, "Sign in to your NEEN account before submitting an order.");
      return;
    }
    const item = selectedPackage();
    if (!item) {
      setError(errorMessage, "Choose an active package from the server catalog.");
      return;
    }
    selectedSummary.package.textContent = item.name;
    selectedSummary.amount.textContent = String(item.diamond_amount);
    selectedSummary.price.textContent = `${item.price} ${item.currency_code}`;
    selectedSummary.player.textContent = playerInput.value;
    form.hidden = true;
    review.hidden = false;
    review.focus?.();
  });

  review.querySelector("[data-diamond-edit]")?.addEventListener("click", () => {
    review.hidden = true;
    form.hidden = false;
  });

  submitButton.addEventListener("click", async () => {
    if (requestInFlight || !isSignedIn) return;
    clearError(reviewError);
    requestInFlight = true;
    submitButton.disabled = true;
    try {
      const csrf = await request("/api/auth/csrf");
      if (typeof csrf.csrf_token !== "string") throw new Error("A CSRF token is unavailable. Sign in again.");
      pendingIdempotencyKey ??= crypto.randomUUID();
      const result = await request("/api/diamonds/orders", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf.csrf_token },
        body: JSON.stringify({
          package_id: Number(packageSelect.value),
          player_id: playerInput.value,
          idempotency_key: pendingIdempotencyKey,
        }),
      });
      pendingIdempotencyKey = null;
      review.hidden = true;
      confirmation.hidden = false;
      confirmation.querySelector("[data-diamond-order-number]").textContent = result.order.order_number;
      confirmation.querySelector("[data-diamond-confirmation-copy]").textContent =
        `Request status: ${result.order.order_status}. Payment verification and delivery are still pending.`;
      confirmation.querySelector("#confirmation-title").focus();
      await loadOrders();
    } catch (error) {
      setError(reviewError, error instanceof Error ? error.message : "The recharge request could not be submitted.");
    } finally {
      requestInFlight = false;
      submitButton.disabled = false;
    }
  });

  document.querySelector("[data-diamond-refresh]")?.addEventListener("click", loadOrders);
  Promise.all([
    loadPackages().catch((error) => {
      packageSelect.disabled = true;
      form.querySelector('button[type="submit"]').disabled = true;
      packageStatus.textContent = error instanceof Error ? error.message : "Package catalog is unavailable.";
    }),
    loadOrders(),
  ]);
})();
