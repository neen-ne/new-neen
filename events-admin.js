(() => {
  const app = document.querySelector("#admin-app");
  if (!(app instanceof HTMLElement)) return;

  const permissions = new Set((app.dataset.permissions ?? "").split(/\s+/).filter(Boolean));
  const panels = [...document.querySelectorAll("[data-panel]")];
  const navItems = [...document.querySelectorAll("[data-section]")];
  const toast = document.querySelector("[data-toast]");
  let toastTimer;
  const loaded = new Set();

  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const showState = (container, message, isError = false) => {
    container.replaceChildren(make("p", `admin-state${isError ? " is-error" : ""}`, message));
  };

  const notify = (message, isError = false) => {
    if (!(toast instanceof HTMLElement)) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle("is-error", isError);
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
  };

  const apiRequest = async (path, options = {}) => {
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
      throw new Error("The server returned an unreadable response. Please refresh and try again.");
    }
    if (!response.ok || result.success !== true) {
      const message = result.errors?.[0]?.message;
      throw new Error(typeof message === "string" ? message : `Request failed (${response.status}).`);
    }
    return result.data;
  };

  const postAdminMutation = async (path, method, payload) => {
    const csrf = await apiRequest("/api/auth/csrf");
    if (typeof csrf.csrf_token !== "string") {
      throw new Error("The server did not provide a CSRF token. Please sign in again.");
    }
    return apiRequest(path, {
      method,
      headers: { "X-CSRF-Token": csrf.csrf_token },
      body: JSON.stringify(payload),
    });
  };

  const setCount = (selector, value, statusSelector, status) => {
    const count = document.querySelector(selector);
    const note = document.querySelector(statusSelector);
    if (count) count.textContent = String(value);
    if (note) note.textContent = status;
  };

  const formatDate = (value) => {
    if (typeof value !== "string" || value === "") return "—";
    return value.replace("T", " ").replace(/\.\d+Z$/, " UTC");
  };

  const buildTable = (headers, rows) => {
    const wrapper = make("div", "admin-table-wrap");
    const table = make("table", "admin-table");
    const head = make("thead");
    const headRow = make("tr");
    for (const label of headers) headRow.append(make("th", "", label));
    head.append(headRow);
    const body = make("tbody");
    for (const row of rows) body.append(row);
    table.append(head, body);
    wrapper.append(table);
    return wrapper;
  };

  const renderAudit = (entries, container, limit = 50) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      showState(container, "No audit entries are available.");
      return;
    }
    const rows = entries.slice(0, limit).map((entry) => {
      const row = make("tr");
      const actor = make("td");
      actor.append(make("strong", "", entry.actor_username || "System"));
      actor.append(make("small", "", `User ID: ${entry.actor_user_id ?? "—"}`));
      const action = make("td");
      action.append(make("strong", "", entry.action_type));
      action.append(make("small", "", `${entry.entity_type}${entry.entity_id ? ` #${entry.entity_id}` : ""}`));
      const when = make("td", "", formatDate(entry.created_at));
      row.append(actor, action, when);
      return row;
    });
    container.replaceChildren(buildTable(["Actor", "Action", "Time (UTC)"], rows));
  };

  const loadAudit = async (force = false) => {
    const container = document.querySelector("[data-audit-list]");
    if (!(container instanceof HTMLElement) || !permissions.has("view_audit_logs")) return;
    if (loaded.has("audit") && !force) return;
    showState(container, "Loading authorized audit entries…");
    try {
      const { entries } = await apiRequest("/api/admin/audit-logs");
      renderAudit(entries, container);
      const count = Array.isArray(entries) ? entries.length : 0;
      setCount("[data-dashboard-audit]", count, "[data-dashboard-audit-status]", `${count} latest server records`);
      const dashboardActivity = document.querySelector("[data-dashboard-activity]");
      if (dashboardActivity instanceof HTMLElement) renderAudit(entries, dashboardActivity, 5);
      loaded.add("audit");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audit log could not be loaded.";
      showState(container, message, true);
      const dashboardActivity = document.querySelector("[data-dashboard-activity]");
      if (dashboardActivity instanceof HTMLElement) showState(dashboardActivity, message, true);
      setCount("[data-dashboard-audit]", "!", "[data-dashboard-audit-status]", "The authorized audit service returned an error");
    }
  };

  const loadGames = async (force = false) => {
    const container = document.querySelector("[data-game-list]");
    if (!(container instanceof HTMLElement) || (loaded.has("games") && !force)) return;
    showState(container, "Loading game catalogs…");
    try {
      const [memory, jigsaw] = await Promise.all([
        apiRequest("/api/games/memory-match"),
        apiRequest("/api/games/picture-jigsaw"),
      ]);
      const games = [memory.game, jigsaw.game];
      container.replaceChildren();
      for (const game of games) {
        const card = make("article", "admin-game-card");
        card.append(make("p", "admin-eyebrow", "SERVER CATALOG"));
        card.append(make("h3", "", game.name));
        card.append(make("p", "", game.description ?? "NEEN original game"));
        const facts = make("div", "admin-game-facts");
        facts.append(make("span", "", "Catalog available"));
        facts.append(make("span", "", `${game.free_attempts_per_day} free starts / day`));
        facts.append(make("span", "", `${game.reset_timezone} reset`));
        if (game.reward_amount_coins !== undefined) {
          facts.append(make("span", "", `${game.reward_amount_coins} Coins / verified win`));
        }
        if (game.pairs_total !== undefined) facts.append(make("span", "", `${game.pairs_total} pairs`));
        if (game.piece_count !== undefined) facts.append(make("span", "", `${game.piece_count} pieces`));
        card.append(facts);
        container.append(card);
      }
      setCount("[data-dashboard-games]", games.length, "[data-dashboard-games-status]", "Read from the public game catalogs");
      loaded.add("games");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Game catalogs could not be loaded.";
      showState(container, message, true);
      setCount("[data-dashboard-games]", "!", "[data-dashboard-games-status]", "The game catalog service returned an error");
    }
  };

  const orderReviewForm = (order) => {
    const form = make("form", "admin-review-form");
    form.dataset.orderId = String(order.id);
    const reason = document.createElement("textarea");
    reason.name = "reason";
    reason.required = true;
    reason.minLength = 3;
    reason.maxLength = 1000;
    reason.placeholder = "Required review reason";
    reason.setAttribute("aria-label", `Review reason for order ${order.id}`);
    const actions = make("div", "admin-review-actions");
    const approve = make("button", "admin-primary-button", "Approve");
    approve.type = "submit";
    approve.name = "decision";
    approve.value = "approved";
    const reject = make("button", "admin-danger-button", "Reject");
    reject.type = "submit";
    reject.name = "decision";
    reject.value = "rejected";
    actions.append(approve, reject);
    form.append(reason, actions);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      if (!(submitter instanceof HTMLButtonElement)) return;
      const decision = submitter.value;
      if (
        decision === "approved"
        && !window.confirm("Approve this order? The server will credit its configured Purchased Coins amount.")
      ) return;
      const buttons = [...form.querySelectorAll("button")];
      buttons.forEach((button) => { button.disabled = true; });
      try {
        await postAdminMutation(`/api/admin/coin-orders/${encodeURIComponent(order.id)}/review`, "POST", {
          decision,
          reason: reason.value,
          idempotency_key: crypto.randomUUID(),
        });
        notify(`Order #${order.id} was ${decision}.`);
        loaded.delete("orders");
        await loadOrders(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : "The order review failed.", true);
        buttons.forEach((button) => { button.disabled = false; });
      }
    });
    return form;
  };

  const loadOrders = async (force = false) => {
    const container = document.querySelector("[data-order-list]");
    if (!(container instanceof HTMLElement) || !permissions.has("review_coin_orders")) return;
    if (loaded.has("orders") && !force) return;
    showState(container, "Loading the protected review queue…");
    try {
      const { orders } = await apiRequest("/api/admin/coin-orders?status=pending_review");
      if (!Array.isArray(orders) || orders.length === 0) {
        showState(container, "There are no Coin orders awaiting review.");
        setCount("[data-dashboard-orders]", 0, "[data-dashboard-orders-status]", "No orders currently await review");
      } else {
        const rows = orders.map((order) => {
          const row = make("tr");
          const orderCell = make("td");
          orderCell.append(make("strong", "", `#${order.id}`));
          orderCell.append(make("small", "", formatDate(order.created_at)));
          const player = make("td");
          player.append(make("strong", "", order.username));
          player.append(make("small", "", order.email));
          const packageCell = make("td");
          packageCell.append(make("strong", "", order.package_name));
          packageCell.append(make("small", "", `${order.coin_amount} Coins · ${order.price} ${order.currency_code}`));
          const payment = make("td");
          payment.append(make("strong", "", order.payment_method_name));
          payment.append(make("small", "admin-order-proof", order.payment_reference || "No payment reference"));
          if (order.proof_details) payment.append(make("small", "admin-order-proof", order.proof_details));
          const evidenceCell = make("td", "", formatDate(order.evidence_submitted_at));
          const reviewCell = make("td");
          reviewCell.append(orderReviewForm(order));
          row.append(orderCell, player, packageCell, payment, evidenceCell, reviewCell);
          return row;
        });
        container.replaceChildren(buildTable(["Order", "Account", "Package", "Payment evidence", "Submitted", "Review"], rows));
        setCount(
          "[data-dashboard-orders]",
          orders.length,
          "[data-dashboard-orders-status]",
          `${orders.length} returned (the API maximum is 100)`,
        );
      }
      loaded.add("orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Coin orders could not be loaded.";
      showState(container, message, true);
      setCount("[data-dashboard-orders]", "!", "[data-dashboard-orders-status]", "The protected order service returned an error");
    }
  };

  const renderCatalog = (items, container, type) => {
    if (!Array.isArray(items) || items.length === 0) {
      showState(container, `No ${type} are configured.`);
      return;
    }
    const rows = items.map((item) => {
      const row = make("tr");
      const name = make("td");
      name.append(make("strong", "", type === "packages" ? item.name : item.display_name));
      name.append(make("small", "", type === "packages" ? `${item.coin_amount} Coins · ${item.currency_code}` : item.code));
      const terms = make("td");
      if (type === "packages") {
        terms.textContent = `${item.price} ${item.currency_code}`;
      } else {
        terms.textContent = item.proof_required ? "Proof required" : "Proof optional";
        if (item.instructions) terms.append(make("small", "", item.instructions));
      }
      const status = make("td");
      status.append(make("span", "admin-status-pill", item.is_active ? "Active" : "Inactive"));
      const action = make("td");
      const toggle = make("button", "admin-secondary-button", item.is_active ? "Deactivate" : "Activate");
      toggle.type = "button";
      toggle.addEventListener("click", async () => {
        toggle.disabled = true;
        try {
          const resource = type === "packages" ? "coin-packages" : "coin-payment-methods";
          await postAdminMutation(`/api/admin/${resource}/${encodeURIComponent(item.id)}`, "PATCH", {
            is_active: !item.is_active,
          });
          notify(`${type === "packages" ? "Package" : "Payment method"} updated.`);
          loaded.delete(type);
          await loadCatalog(type, true);
        } catch (error) {
          notify(error instanceof Error ? error.message : "The catalog update failed.", true);
          toggle.disabled = false;
        }
      });
      action.append(toggle);
      row.append(name, terms, status, action);
      return row;
    });
    container.replaceChildren(buildTable(["Name", "Terms", "Status", "Action"], rows));
  };

  const loadCatalog = async (type, force = false) => {
    const permission = type === "packages" ? "manage_coin_packages" : "manage_coin_payment_methods";
    const container = document.querySelector(type === "packages" ? "[data-package-list]" : "[data-method-list]");
    if (!(container instanceof HTMLElement) || !permissions.has(permission)) return;
    if (loaded.has(type) && !force) return;
    showState(container, "Loading server catalog…");
    try {
      const resource = type === "packages" ? "coin-packages" : "coin-payment-methods";
      const data = await apiRequest(`/api/admin/${resource}`);
      const items = type === "packages" ? data.packages : data.payment_methods;
      renderCatalog(items, container, type);
      loaded.add(type);
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "Catalog could not be loaded.", true);
    }
  };

  const bindCatalogForm = (selector, type, resource, fields) => {
    const form = document.querySelector(selector);
    if (!(form instanceof HTMLFormElement)) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      const values = new FormData(form);
      const payload = {};
      for (const field of fields) {
        if (field.type === "boolean") {
          payload[field.name] = values.has(field.name);
        } else {
          payload[field.name] = String(values.get(field.name) ?? "").trim();
        }
      }
      try {
        await postAdminMutation(`/api/admin/${resource}`, "POST", payload);
        form.reset();
        notify(`${type} created. Review its server status before publishing.`);
        loaded.delete(type === "package" ? "packages" : "methods");
        await loadCatalog(type === "package" ? "packages" : "methods", true);
      } catch (error) {
        notify(error instanceof Error ? error.message : `${type} could not be created.`, true);
      } finally {
        if (submit instanceof HTMLButtonElement) submit.disabled = false;
      }
    });
  };

  bindCatalogForm("[data-package-form]", "package", "coin-packages", [
    { name: "name" },
    { name: "coin_amount" },
    { name: "price" },
    { name: "currency_code" },
    { name: "is_active", type: "boolean" },
  ]);
  bindCatalogForm("[data-method-form]", "payment method", "coin-payment-methods", [
    { name: "code" },
    { name: "display_name" },
    { name: "instructions" },
    { name: "proof_required", type: "boolean" },
    { name: "is_active", type: "boolean" },
  ]);

  const loadHomepageRewardConfig = async (force = false) => {
    const container = document.querySelector("[data-homepage-reward-config]");
    const form = document.querySelector("[data-homepage-reward-form]");
    if (
      !(container instanceof HTMLElement)
      || !(form instanceof HTMLFormElement)
      || !permissions.has("manage_homepage_rewards")
      || (loaded.has("homepage-rewards") && !force)
    ) return;
    showState(container, "Loading server reward settings…");
    try {
      const { configuration } = await apiRequest("/api/admin/homepage-rewards");
      form.elements.namedItem("reward_amount").value = configuration.reward_amount ?? "";
      form.elements.namedItem("window_seconds").value = configuration.window_seconds ?? "";
      form.elements.namedItem("is_active").checked = configuration.is_active;
      showState(
        container,
        configuration.is_active
          ? `Active: ${configuration.reward_amount} Earned Coins every ${configuration.window_seconds} seconds.`
          : "Inactive: no homepage reward can currently be claimed.",
      );
      loaded.add("homepage-rewards");
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "Reward settings could not be loaded.", true);
    }
  };

  const homepageRewardForm = document.querySelector("[data-homepage-reward-form]");
  if (homepageRewardForm instanceof HTMLFormElement) {
    homepageRewardForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = homepageRewardForm.querySelector('button[type="submit"]');
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      const formValues = new FormData(homepageRewardForm);
      try {
        await postAdminMutation("/api/admin/homepage-rewards", "PATCH", {
          reward_amount: String(formValues.get("reward_amount") ?? ""),
          window_seconds: String(formValues.get("window_seconds") ?? ""),
          is_active: formValues.has("is_active"),
        });
        notify("Homepage reward settings saved.");
        loaded.delete("homepage-rewards");
        await loadHomepageRewardConfig(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Homepage reward settings could not be saved.", true);
      } finally {
        if (submit instanceof HTMLButtonElement) submit.disabled = false;
      }
    });
  }

  const renderEventCard = (event, includeRewardForm = false) => {
    const card = make("article", "admin-module-card");
    const heading = make("div", "admin-module-heading");
    heading.append(make("h3", "", event.title));
    heading.append(make("span", "admin-status-pill", String(event.status).replaceAll("_", " ")));
    card.append(heading);
    card.append(make("p", "admin-module-description", event.description));
    const facts = make("div", "admin-module-facts");
    facts.append(make("span", "", `Voting: ${formatDate(event.starts_at)} — ${formatDate(event.ends_at)}`));
    facts.append(make("span", "", `${event.total_votes ?? 0} vote(s)`));
    card.append(facts);
    const options = Array.isArray(event.options) ? event.options : [];
    if (options.length) {
      const optionList = make("ul", "admin-event-options");
      for (const option of options) {
        const votes = option.vote_count === undefined ? "" : ` — ${option.vote_count} vote(s)`;
        optionList.append(make("li", "", `${option.label}${votes}`));
      }
      card.append(optionList);
    }

    const actions = make("div", "admin-module-actions");
    if (event.status === "draft" || event.status === "paused") {
      actions.append(makeAdminButton("Publish voting", "publish", event.id));
    } else if (event.status === "published") {
      actions.append(makeAdminButton("Pause voting", "paused", event.id));
      actions.append(makeAdminButton("Approve results", "approve-results", event.id, true));
    }
    if (event.status !== "cancelled" && event.status !== "results_published") {
      actions.append(makeAdminButton("Cancel event", "cancelled", event.id, true));
    }
    actions.append(makeAdminButton("Activity log", "event-activity", event.id));
    card.append(actions);

    const edit = document.createElement("details");
    edit.hidden = event.status === "results_published";
    const editSummary = make("summary", "", "Edit event details");
    edit.append(editSummary);
    const editForm = make("form", "admin-form-grid");
    editForm.dataset.eventEditForm = "";
    editForm.dataset.eventId = String(event.id);
    const localDateTime = (value) => {
      const date = new Date(value);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    };
    const appendEditField = (labelText, name, value, wide = false, multiline = false) => {
      const label = make("label", wide ? "admin-form-wide" : "", labelText);
      const input = multiline ? document.createElement("textarea") : document.createElement("input");
      input.name = name;
      input.value = value;
      input.required = true;
      if (multiline) {
        input.rows = 3;
        input.maxLength = name === "description" ? 4000 : 1500;
      } else if (name === "starts_at" || name === "ends_at") {
        input.type = "datetime-local";
      } else {
        input.maxLength = 150;
      }
      label.append(input);
      editForm.append(label);
    };
    appendEditField("Title", "title", event.title);
    appendEditField("Starts at (local time)", "starts_at", localDateTime(event.starts_at));
    appendEditField("Ends at (local time)", "ends_at", localDateTime(event.ends_at));
    appendEditField("Description", "description", event.description, true, true);
    if ((event.total_votes ?? 0) === 0) {
      appendEditField("Poll options (one per line)", "options", options.map((option) => option.label).join("\n"), true, true);
    }
    const saveEdit = make("button", "admin-primary-button", "Save event changes");
    saveEdit.type = "submit";
    editForm.append(saveEdit);
    edit.append(editForm);
    card.append(edit);

    if (includeRewardForm && permissions.has("manage_event_rewards") && event.status === "results_published") {
      const form = make("form", "admin-event-reward-form");
      form.dataset.eventId = String(event.id);
      form.append(make("h4", "", "Award an eligible participant"));
      for (const [label, name, type, min] of [
        ["Participant user ID", "user_id", "number", "1"],
        ["Earned Coins", "amount", "number", "1"],
      ]) {
        const field = make("label", "", label);
        const input = document.createElement("input");
        input.name = name;
        input.type = type;
        input.min = min;
        input.step = "1";
        input.required = true;
        field.append(input);
        form.append(field);
      }
      const reason = make("label", "", "Reason");
      const reasonInput = document.createElement("input");
      reasonInput.name = "reason";
      reasonInput.minLength = 3;
      reasonInput.maxLength = 1000;
      reasonInput.required = true;
      reason.append(reasonInput);
      form.append(reason, make("button", "admin-primary-button", "Issue reward"));
      const submit = form.querySelector("button");
      submit.type = "submit";
      card.append(form);
    }
    return card;
  };

  const makeAdminButton = (label, action, id, danger = false) => {
    const button = make("button", danger ? "admin-danger-button" : "admin-secondary-button", label);
    button.type = "button";
    button.dataset.adminAction = action;
    button.dataset.id = String(id);
    return button;
  };

  const loadCommunityEvents = async (force = false) => {
    const containers = [
      document.querySelector("[data-community-events-list]"),
      document.querySelector("[data-event-results-list]"),
    ].filter((container) => container instanceof HTMLElement);
    if (!containers.length || !permissions.has("manage_community_events")) return;
    if (loaded.has("community-events") && !force) return;
    containers.forEach((container) => showState(container, "Loading events from the database…"));
    try {
      const { events } = await apiRequest("/api/admin/events");
      const items = Array.isArray(events) ? events : [];
      await Promise.all(items.map(async (event) => {
        if (event.status !== "results_published") return;
        const { event: details } = await apiRequest(`/api/events/${event.id}`);
        event.options = details.options;
        event.total_votes = details.total_votes;
      }));
      const eventContainer = containers.find((container) => container.matches("[data-community-events-list]"));
      if (eventContainer) {
        if (!items.length) showState(eventContainer, "No community events have been created.");
        else eventContainer.replaceChildren(...items.map((event) => renderEventCard(event, true)));
      }
      const resultsContainer = containers.find((container) => container.matches("[data-event-results-list]"));
      if (resultsContainer) {
        if (!items.length) showState(resultsContainer, "No voting events or results are available.");
        else resultsContainer.replaceChildren(...items.map((event) => renderEventCard(event)));
      }
      const published = items.filter((event) => event.status === "published").length;
      setCount("[data-dashboard-events]", items.length, "[data-dashboard-events-status]", `${published} currently published`);
      loaded.add("community-events");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Community events could not be loaded.";
      containers.forEach((container) => showState(container, message, true));
      setCount("[data-dashboard-events]", "!", "[data-dashboard-events-status]", "The authorized community-events service returned an error");
    }
  };

  const loadEventSuggestions = async (force = false) => {
    const container = document.querySelector("[data-event-suggestions-list]");
    if (!(container instanceof HTMLElement) || !permissions.has("review_event_suggestions")) return;
    if (loaded.has("event-suggestions") && !force) return;
    showState(container, "Loading pending suggestions…");
    try {
      const { suggestions } = await apiRequest("/api/admin/event-suggestions");
      const items = Array.isArray(suggestions) ? suggestions : [];
      if (!items.length) showState(container, "There are no suggestions waiting for review.");
      else {
        container.replaceChildren(...items.map((suggestion) => {
          const card = make("article", "admin-module-card");
          const heading = make("div", "admin-module-heading");
          heading.append(make("h3", "", suggestion.title));
          heading.append(make("span", "admin-status-pill", suggestion.status));
          card.append(heading);
          card.append(make("p", "admin-module-description", suggestion.description));
          card.append(make("p", "admin-module-meta", `Submitted by ${suggestion.username} (user ${suggestion.user_id}) · ${formatDate(suggestion.created_at)}`));
          const form = make("form", "admin-suggestion-review");
          form.dataset.suggestionId = String(suggestion.id);
          const note = document.createElement("textarea");
          note.name = "note";
          note.maxLength = 1000;
          note.placeholder = "Optional reviewer note";
          form.append(note);
          for (const [label, decision, danger] of [["Accept", "accepted", false], ["Reject", "rejected", true]]) {
            const button = make("button", danger ? "admin-danger-button" : "admin-primary-button", label);
            button.type = "submit";
            button.value = decision;
            button.name = "decision";
            form.append(button);
          }
          card.append(form);
          return card;
        }));
      }
      setCount("[data-dashboard-suggestions]", items.length, "[data-dashboard-suggestions-status]", "Pending submissions from the database");
      loaded.add("event-suggestions");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Suggestions could not be loaded.";
      showState(container, message, true);
      setCount("[data-dashboard-suggestions]", "!", "[data-dashboard-suggestions-status]", "The authorized suggestion service returned an error");
    }
  };

  const loadDiamondPackages = async (force = false) => {
    const container = document.querySelector("[data-diamond-package-list]");
    if (!(container instanceof HTMLElement) || !permissions.has("manage_diamond_packages")) return;
    if (loaded.has("diamond-packages") && !force) return;
    showState(container, "Loading diamond packages…");
    try {
      const { packages } = await apiRequest("/api/admin/diamonds/packages");
      const items = Array.isArray(packages) ? packages : [];
      if (!items.length) showState(container, "No diamond packages are configured.");
      else {
        const rows = items.map((item) => {
          const row = make("tr");
          const name = make("td");
          name.append(make("strong", "", item.name));
          name.append(make("small", "", `ID: ${item.id}`));
          const terms = make("td", "", `${item.diamond_amount} diamonds · ${item.price} ${item.currency_code}`);
          const status = make("td", "", item.is_active ? "Active" : "Inactive");
          const action = make("td");
          const button = makeAdminButton(item.is_active ? "Deactivate" : "Activate", "diamond-package-toggle", item.id, item.is_active);
          button.dataset.active = String(!item.is_active);
          action.append(button);
          row.append(name, terms, status, action);
          return row;
        });
        container.replaceChildren(buildTable(["Package", "Terms", "Status", "Action"], rows));
      }
      loaded.add("diamond-packages");
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "Diamond packages could not be loaded.", true);
    }
  };

  const loadDiamondOrders = async (search = "", force = false) => {
    const container = document.querySelector("[data-diamond-admin-orders]");
    if (!(container instanceof HTMLElement) || !permissions.has("manage_diamond_orders")) return;
    if (loaded.has("diamond-orders") && !force && search === "") return;
    showState(container, "Loading recharge orders…");
    try {
      const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const { orders } = await apiRequest(`/api/admin/diamonds/orders${query}`);
      const items = Array.isArray(orders) ? orders : [];
      if (!items.length) showState(container, "No matching diamond recharge orders.");
      else {
        const rows = items.map((order) => {
          const row = make("tr");
          const identity = make("td");
          identity.append(make("strong", "", order.order_number));
          identity.append(make("small", "", `${order.username} · Player ID ${order.player_id}`));
          identity.append(make("small", "admin-order-proof", order.payment_reference || "No payment reference"));
          identity.append(make("small", "", `User ${order.user_id} · ${formatDate(order.created_at)}`));
          const packageInfo = make("td", "", `${order.package_name} · ${order.diamond_amount} diamonds · ${order.price} ${order.currency_code}`);
          const state = make("td");
          state.append(make("strong", "", String(order.order_status).replaceAll("_", " ")));
          state.append(make("small", "", `Payment: ${order.payment_status} · Delivery: ${order.delivery_status}`));
          const action = make("td");
          const actions = diamondOrderActions(order.order_status, order.payment_status, order.delivery_status);
          const actionWrap = make("div", "admin-order-action-list");
          actions.forEach(([label, name]) => {
            const actionButton = makeAdminButton(
              label,
              "diamond-order-action",
              order.id,
              ["reject_payment", "refund", "fail_payment", "fail_delivery"].includes(name),
            );
            actionButton.dataset.transition = name;
            actionWrap.append(actionButton);
          });
          actionWrap.append(makeAdminButton("History", "diamond-order-history", order.id));
          action.append(actionWrap);
          row.append(identity, packageInfo, state, action);
          return row;
        });
        container.replaceChildren(buildTable(["Order / Player", "Package", "State", "Admin action"], rows));
      }
      if (search.trim() === "") {
        const pending = items.filter((order) => ["pending", "payment_verification"].includes(order.order_status)).length;
        setCount("[data-dashboard-diamonds]", pending, "[data-dashboard-diamonds-status]", "Pending payment review in the latest 100 server results");
      }
      loaded.add("diamond-orders");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Diamond orders could not be loaded.";
      showState(container, message, true);
      setCount("[data-dashboard-diamonds]", "!", "[data-dashboard-diamonds-status]", "The authorized recharge service returned an error");
    }
  };

  const diamondOrderActions = (status, paymentStatus, deliveryStatus) => {
    if (status === "pending") return [["Start payment review", "begin_verification"], ["Reject payment", "reject_payment"]];
    if (status === "payment_verification") {
      return [["Mark paid", "mark_paid"], ["Reject payment", "reject_payment"], ["Mark payment failed", "fail_payment"]];
    }
    if (status === "paid") return [["Start delivery", "begin_delivery"], ["Refund", "refund"]];
    if (status === "processing") return [["Mark delivered", "mark_delivered"], ["Mark delivery failed", "fail_delivery"]];
    if (status === "failed" && paymentStatus === "paid" && deliveryStatus !== "delivered") return [["Refund", "refund"]];
    return [];
  };

  const loadDiamondOrderHistory = async (id) => {
    const container = document.querySelector("[data-diamond-order-history]");
    if (!(container instanceof HTMLElement)) return;
    showState(container, "Loading order history…");
    try {
      const { order } = await apiRequest(`/api/admin/diamonds/orders/${id}`);
      const rows = (order.activity ?? []).map((entry) => {
        const row = make("tr");
        row.append(make("td", "", `${entry.activity_type} (${entry.from_order_status ?? "—"} → ${entry.to_order_status ?? "—"})`));
        row.append(make("td", "", `Payment: ${entry.payment_status} · Delivery: ${entry.delivery_status}`));
        const actor = make("td");
        actor.append(make("strong", "", entry.actor_username ?? "User"));
        actor.append(make("small", "", entry.admin_note ?? "No note"));
        row.append(actor, make("td", "", formatDate(entry.created_at)));
        return row;
      });
      if (!rows.length) showState(container, "No activity has been recorded for this order.");
      else {
        container.replaceChildren(make("h3", "", `Order ${order.order_number} history`), buildTable(["Activity", "State", "Actor / Note", "Time (UTC)"], rows));
      }
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "Order history could not be loaded.", true);
    }
  };

  const loadAdminUsers = async (search = "", adminsOnly = false, force = false) => {
    const container = document.querySelector(adminsOnly ? "[data-admin-accounts]" : "[data-admin-users]");
    if (!(container instanceof HTMLElement) || !permissions.has("view_admin_users")) return;
    const key = adminsOnly ? "admin-accounts" : "admin-users";
    if (loaded.has(key) && !force && search === "") return;
    showState(container, adminsOnly ? "Loading administrative accounts…" : "Searching account records…");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (adminsOnly) params.set("admins_only", "1");
      const query = params.toString();
      const suffix = query ? `?${query}` : "";
      const { users } = await apiRequest(`/api/admin/users${suffix}`);
      const items = Array.isArray(users) ? users : [];
      if (!items.length) showState(container, adminsOnly ? "No administrative accounts were found." : "No users matched this search.");
      else {
        const rows = items.map((user) => {
          const row = make("tr");
          const account = make("td");
          account.append(make("strong", "", user.username));
          account.append(make("small", "", `User ID: ${user.id} · ${user.status} · Created ${formatDate(user.created_at)}`));
          const roles = make("td");
          roles.append(make("strong", "", user.roles.length ? user.roles.join(", ") : "No roles"));
          const permissionList = make("td", "", user.permissions.length ? user.permissions.join(", ") : "No permissions");
          row.append(account, roles, permissionList);
          return row;
        });
        container.replaceChildren(buildTable(["Account", "Roles", "Effective permissions"], rows));
      }
      loaded.add(key);
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "User directory could not be loaded.", true);
    }
  };

  const loadAdminWallets = async (search = "", force = false) => {
    const container = document.querySelector("[data-admin-wallets]");
    if (!(container instanceof HTMLElement) || !permissions.has("view_all_wallets")) return;
    if (loaded.has("admin-wallets") && !force && search.trim() === "") return;
    showState(container, "Loading wallet records…");
    try {
      const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const { wallets } = await apiRequest(`/api/admin/wallets${query}`);
      const items = Array.isArray(wallets) ? wallets : [];
      if (!items.length) showState(container, "No wallets matched this search.");
      else {
        const rows = items.map((wallet) => {
          const row = make("tr");
          const account = make("td");
          account.append(make("strong", "", wallet.username));
          account.append(make("small", "", `User ID: ${wallet.user_id} · Updated ${formatDate(wallet.updated_at)}`));
          const coins = make("td");
          coins.append(make("strong", "", `${wallet.coin_balance} total Coins`));
          coins.append(make("small", "", `${wallet.purchased_coin_balance} Purchased · ${wallet.earned_coin_balance} Earned`));
          const otherBalance = make("td", "", `${wallet.diamond_balance} Diamonds · ${wallet.currency_code}`);
          const action = make("td");
          action.append(makeAdminButton("Transactions", "wallet-transactions", wallet.user_id));
          row.append(account, coins, otherBalance, action);
          return row;
        });
        container.replaceChildren(buildTable(["Account", "Coins", "Other balances", "Ledger"], rows));
      }
      loaded.add("admin-wallets");
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "Wallet records could not be loaded.", true);
    }
  };

  const loadWalletTransactions = async (userId) => {
    const container = document.querySelector("[data-wallet-transactions]");
    if (!(container instanceof HTMLElement)) return;
    showState(container, "Loading wallet ledger…");
    try {
      const { entries } = await apiRequest(`/api/admin/wallets/${userId}/transactions`);
      const rows = (Array.isArray(entries) ? entries : []).map((entry) => {
        const row = make("tr");
        const operation = make("td");
        operation.append(make("strong", "", `${entry.operation_type} · ${entry.amount} ${entry.balance_type} Coins`));
        operation.append(make("small", "", entry.source));
        row.append(operation);
        row.append(make("td", "", `${entry.balance_before} → ${entry.balance_after} (${entry.total_balance_before} → ${entry.total_balance_after} total)`));
        row.append(make("td", "", `${entry.reference_type ?? "—"}${entry.reference_id ? ` #${entry.reference_id}` : ""}`));
        row.append(make("td", "", formatDate(entry.created_at)));
        return row;
      });
      if (!rows.length) showState(container, "No Coins ledger entries are recorded for this account.");
      else container.replaceChildren(make("h3", "", `Recent ledger entries · user ${userId}`), buildTable(["Operation", "Balance", "Reference", "Time (UTC)"], rows));
    } catch (error) {
      showState(container, error instanceof Error ? error.message : "Wallet transaction history could not be loaded.", true);
    }
  };

  const bindDirectorySearch = (selector, loader, refreshSelector) => {
    const form = document.querySelector(selector);
    if (form instanceof HTMLFormElement) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = new FormData(form);
        loader(String(values.get("q") ?? ""), true);
      });
    }
    document.querySelector(refreshSelector)?.addEventListener("click", () => {
      if (form instanceof HTMLFormElement) form.reset();
      loader("", true);
    });
  };

  bindDirectorySearch("[data-admin-user-search]", (query) => loadAdminUsers(query, false, true), "[data-refresh-users]");
  bindDirectorySearch("[data-wallet-search]", loadAdminWallets, "[data-refresh-wallets]");

  const bindCommunityEventForm = () => {
    const form = document.querySelector("[data-community-event-form]");
    if (!(form instanceof HTMLFormElement)) return;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      const values = new FormData(form);
      const toIsoSeconds = (value) => new Date(String(value)).toISOString().replace(/\.\d{3}Z$/, "Z");
      const options = String(values.get("options") ?? "").split(/\r?\n/).map((option) => option.trim()).filter(Boolean);
      try {
        await postAdminMutation("/api/admin/events", "POST", {
          title: String(values.get("title") ?? "").trim(),
          description: String(values.get("description") ?? "").trim(),
          starts_at: toIsoSeconds(values.get("starts_at")),
          ends_at: toIsoSeconds(values.get("ends_at")),
          options,
        });
        form.reset();
        notify("Draft event created. Publish it when ready.");
        loaded.delete("community-events");
        await loadCommunityEvents(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Community event could not be created.", true);
      } finally {
        if (submit instanceof HTMLButtonElement) submit.disabled = false;
      }
    });
  };

  bindCommunityEventForm();

  document.addEventListener("submit", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLFormElement)) return;
    if (target.matches("[data-event-edit-form]")) {
      event.preventDefault();
      const submit = target.querySelector('button[type="submit"]');
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      const values = new FormData(target);
      const toIsoSeconds = (value) => new Date(String(value)).toISOString().replace(/\.\d{3}Z$/, "Z");
      const payload = {
        title: String(values.get("title") ?? "").trim(),
        description: String(values.get("description") ?? "").trim(),
        starts_at: toIsoSeconds(values.get("starts_at")),
        ends_at: toIsoSeconds(values.get("ends_at")),
      };
      if (values.has("options")) {
        payload.options = String(values.get("options") ?? "").split(/\r?\n/).map((option) => option.trim()).filter(Boolean);
      }
      try {
        await postAdminMutation(`/api/admin/events/${target.dataset.eventId}`, "PATCH", payload);
        notify("Event details saved.");
        loaded.delete("community-events");
        await loadCommunityEvents(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Event details could not be saved.", true);
        if (submit instanceof HTMLButtonElement) submit.disabled = false;
      }
    } else if (target.matches("[data-event-reward-form]")) {
      event.preventDefault();
      const submit = target.querySelector('button[type="submit"]');
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      const values = new FormData(target);
      try {
        const eventId = target.dataset.eventId;
        await postAdminMutation(`/api/admin/events/${eventId}/rewards`, "POST", {
          user_id: String(values.get("user_id") ?? ""),
          amount: String(values.get("amount") ?? ""),
          reason: String(values.get("reason") ?? "").trim(),
        });
        target.reset();
        notify("Event reward issued to the eligible participant.");
      } catch (error) {
        notify(error instanceof Error ? error.message : "Event reward could not be issued.", true);
      } finally {
        if (submit instanceof HTMLButtonElement) submit.disabled = false;
      }
    } else if (target.matches("[data-suggestion-id]")) {
      event.preventDefault();
      const submitter = event.submitter;
      if (!(submitter instanceof HTMLButtonElement) || !["accepted", "rejected"].includes(submitter.value)) return;
      const values = new FormData(target);
      [...target.querySelectorAll("button")].forEach((button) => { button.disabled = true; });
      try {
        await postAdminMutation(`/api/admin/event-suggestions/${target.dataset.suggestionId}/review`, "POST", {
          decision: submitter.value,
          note: String(values.get("note") ?? "").trim(),
        });
        notify(`Suggestion ${submitter.value}.`);
        loaded.delete("event-suggestions");
        await loadEventSuggestions(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Suggestion review could not be saved.", true);
        [...target.querySelectorAll("button")].forEach((button) => { button.disabled = false; });
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-admin-action]") : null;
    if (!(button instanceof HTMLButtonElement) || button.disabled) return;
    const { adminAction, id } = button.dataset;
    button.disabled = true;
    try {
      if (adminAction === "event-activity") {
        const container = document.querySelector("[data-event-results-list]");
        const { entries } = await apiRequest(`/api/admin/events/${id}/activity`);
        if (container instanceof HTMLElement) {
          const card = make("div", "admin-panel");
          card.append(make("h3", "", `Activity for event ${id}`));
          const rows = entries.map((entry) => {
            const row = make("tr");
            row.append(make("td", "", entry.activity_type));
            row.append(make("td", "", entry.actor_username ?? "User"));
            row.append(make("td", "", formatDate(entry.created_at)));
            return row;
          });
          card.append(rows.length ? buildTable(["Activity", "Actor", "Time (UTC)"], rows) : make("p", "admin-state", "No event activity has been recorded."));
          container.append(card);
        }
      } else if (adminAction === "approve-results") {
        if (!window.confirm("Approve and publish the server-calculated voting results?")) return;
        await postAdminMutation(`/api/admin/events/${id}/results/approve`, "POST", {});
        notify("Event results approved and published.");
        loaded.delete("community-events");
        await loadCommunityEvents(true);
      } else if (adminAction === "publish" || adminAction === "paused" || adminAction === "cancelled") {
        const status = adminAction === "publish" ? "published" : adminAction;
        if (status === "cancelled" && !window.confirm("Cancel this event? This cannot be undone.")) return;
        await postAdminMutation(`/api/admin/events/${id}`, "PATCH", { status });
        notify(`Event ${status.replaceAll("_", " ")}.`);
        loaded.delete("community-events");
        await loadCommunityEvents(true);
      } else if (adminAction === "diamond-package-toggle") {
        await postAdminMutation(`/api/admin/diamonds/packages/${id}`, "PATCH", { is_active: button.dataset.active === "true" });
        notify("Diamond package status updated.");
        loaded.delete("diamond-packages");
        await loadDiamondPackages(true);
      } else if (adminAction === "diamond-order-history") {
        await loadDiamondOrderHistory(id);
      } else if (adminAction === "wallet-transactions") {
        await loadWalletTransactions(id);
      } else if (adminAction === "diamond-order-action") {
        const transition = button.dataset.transition;
        const note = window.prompt("Enter an administrative note (required):");
        if (note === null) return;
        const payload = { action: transition, note: note.trim() };
        if (transition === "mark_paid") {
          const reference = window.prompt("Optional payment reference:");
          if (reference) payload.payment_reference = reference.trim();
        }
        await postAdminMutation(`/api/admin/diamonds/orders/${id}/actions`, "POST", payload);
        notify("Diamond order state updated.");
        await loadDiamondOrders("", true);
        await loadDiamondOrderHistory(id);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "The requested admin action failed.", true);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  });

  const diamondPackageForm = document.querySelector("[data-diamond-package-form]");
  if (diamondPackageForm instanceof HTMLFormElement) {
    diamondPackageForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = diamondPackageForm.querySelector('button[type="submit"]');
      if (submit instanceof HTMLButtonElement) submit.disabled = true;
      const values = new FormData(diamondPackageForm);
      try {
        await postAdminMutation("/api/admin/diamonds/packages", "POST", {
          name: String(values.get("name") ?? "").trim(),
          diamond_amount: String(values.get("diamond_amount") ?? ""),
          price: String(values.get("price") ?? ""),
          currency_code: String(values.get("currency_code") ?? "").trim().toUpperCase(),
        });
        diamondPackageForm.reset();
        notify("Inactive diamond package created.");
        loaded.delete("diamond-packages");
        await loadDiamondPackages(true);
      } catch (error) {
        notify(error instanceof Error ? error.message : "Diamond package could not be created.", true);
      } finally {
        if (submit instanceof HTMLButtonElement) submit.disabled = false;
      }
    });
  }

  const orderSearchForm = document.querySelector("[data-diamond-order-search]");
  if (orderSearchForm instanceof HTMLFormElement) {
    orderSearchForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const values = new FormData(orderSearchForm);
      await loadDiamondOrders(String(values.get("q") ?? ""), true);
    });
  }
  document.querySelector("[data-refresh-events]")?.addEventListener("click", () => loadCommunityEvents(true));
  document.querySelector("[data-refresh-diamond-orders]")?.addEventListener("click", () => {
    if (orderSearchForm instanceof HTMLFormElement) orderSearchForm.reset();
    loadDiamondOrders("", true);
  });

  const openSection = (section) => {
    const target = panels.find((panel) => panel.dataset.panel === section);
    if (!target) return;
    panels.forEach((panel) => {
      const active = panel === target;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    navItems.forEach((item) => {
      const active = item.dataset.section === section;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (section === "orders") loadOrders();
    if (section === "games") loadGames();
    if (section === "users") loadAdminUsers();
    if (section === "wallet") loadAdminWallets();
    if (section === "admins") loadAdminUsers("", true);
    if (section === "audit") loadAudit();
    if (section === "homepage-rewards") loadHomepageRewardConfig();
    if (section === "community-events" || section === "event-results") loadCommunityEvents();
    if (section === "event-suggestions") loadEventSuggestions();
    if (section === "diamond-packages") loadDiamondPackages();
    if (section === "diamond-orders") loadDiamondOrders();
    if (section === "coin-config") {
      loadCatalog("packages");
      loadCatalog("methods");
    }
  };

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (!item.disabled && item.dataset.section) openSection(item.dataset.section);
    });
  });
  document.querySelector("[data-open-section='audit']")?.addEventListener("click", () => openSection("audit"));
  document.querySelector("[data-refresh-orders]")?.addEventListener("click", () => loadOrders(true));
  document.querySelector("[data-refresh-audit]")?.addEventListener("click", () => loadAudit(true));

  document.querySelector("[data-logout]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;
    button.disabled = true;
    try {
      await postAdminMutation("/api/auth/logout", "POST", {});
      window.location.assign("/account.html");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Sign out failed.", true);
      button.disabled = false;
    }
  });

  const requestedSection = new URLSearchParams(window.location.search).get("section");
  const requestedNavItem = navItems.find((item) => item.dataset.section === requestedSection && !item.disabled);
  if (requestedNavItem?.dataset.section) {
    openSection(requestedNavItem.dataset.section);
  } else {
    loadGames();
    if (permissions.has("review_coin_orders")) loadOrders();
    if (permissions.has("view_audit_logs")) loadAudit();
    if (permissions.has("manage_homepage_rewards")) loadHomepageRewardConfig();
    if (permissions.has("view_admin_users")) loadAdminUsers("", true);
    if (permissions.has("manage_community_events")) loadCommunityEvents();
    if (permissions.has("review_event_suggestions")) loadEventSuggestions();
    if (permissions.has("manage_diamond_packages")) loadDiamondPackages();
    if (permissions.has("manage_diamond_orders")) loadDiamondOrders();
    if (permissions.has("manage_coin_packages") || permissions.has("manage_coin_payment_methods")) {
      loadCatalog("packages");
      loadCatalog("methods");
    }
  }
})();
