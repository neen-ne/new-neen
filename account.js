(() => {
  const message = document.querySelector("[data-account-message]");
  const authPanel = document.querySelector("[data-auth-panel]");
  const profilePanel = document.querySelector("[data-profile-panel]");
  const tabs = document.querySelector("[data-auth-tabs]");
  const forms = {
    login: document.querySelector("#login-form"),
    register: document.querySelector("#register-form"),
    forgot: document.querySelector("#forgot-form"),
    reset: document.querySelector("#reset-form"),
    profile: document.querySelector("#profile-form"),
  };
  const attendanceButton = document.querySelector("[data-attendance-checkin]");
  const attendanceStatus = profilePanel.querySelector("[data-attendance-status]");
  let csrfToken = "";
  let csrfPromise = null;
  let resetToken = new URLSearchParams(window.location.hash.slice(1)).get("reset_token") || "";

  const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
    message.classList.toggle("is-success", !isError && text !== "");
  };

  const api = async (path, method = "GET", data = null) => {
    const options = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (data !== null) {
      options.headers["Content-Type"] = "application/json";
      options.headers["X-CSRF-Token"] = await ensureCsrf();
      options.body = JSON.stringify(data);
    }
    const response = await fetch(`/api/${path}`, options);
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The account service returned an invalid response.");
    }
    if (!response.ok || !result.success) {
      const error = new Error(result.errors?.[0]?.message || "The request could not be completed.");
      error.code = result.errors?.[0]?.code;
      error.status = response.status;
      throw error;
    }
    return result.data;
  };

  const requestCsrfToken = async () => {
    const result = await api("auth/csrf");
    if (typeof result.csrf_token !== "string" || result.csrf_token === "") {
      throw new Error("The account service did not provide a CSRF token.");
    }
    csrfToken = result.csrf_token;
    return csrfToken;
  };

  const ensureCsrf = async () => {
    if (csrfToken !== "") return csrfToken;
    if (csrfPromise === null) {
      csrfPromise = requestCsrfToken().finally(() => {
        csrfPromise = null;
      });
    }
    return csrfPromise;
  };

  const setMode = (mode) => {
    Object.entries(forms).forEach(([name, form]) => {
      if (name !== "profile") form.hidden = name !== mode;
    });
    tabs.hidden = mode === "forgot" || mode === "reset";
    tabs.querySelectorAll("[data-mode]").forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    showMessage("");
  };

  const element = (tagName, className, text) => {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const formatCoins = (value) => new Intl.NumberFormat().format(value);
  const formatDate = (value) => new Date(`${value.replace(" ", "T")}Z`).toLocaleString();
  const idempotencyKey = () => crypto.randomUUID();

  const renderWallet = (wallet, entries) => {
    profilePanel.querySelector("[data-wallet-balance]").textContent = formatCoins(wallet.total_coin_balance);
    profilePanel.querySelector("[data-purchased-balance]").textContent = formatCoins(wallet.purchased_coin_balance);
    profilePanel.querySelector("[data-earned-balance]").textContent = formatCoins(wallet.earned_coin_balance);

    const ledger = profilePanel.querySelector("[data-coin-ledger]");
    ledger.replaceChildren();
    if (entries.length === 0) {
      ledger.append(element("li", "coin-ledger-item coin-ledger-meta", "No Coins activity yet."));
      return;
    }

    entries.forEach((entry) => {
      const item = element("li", "coin-ledger-item");
      const direction = entry.operation_type === "debit" ? "−" : "+";
      const amount = element(
        "span",
        `coin-ledger-amount ${entry.operation_type === "debit" ? "is-debit" : "is-credit"}`,
        `${direction}${formatCoins(entry.amount)} ${entry.balance_type} Coins`,
      );
      item.append(
        element("p", "coin-ledger-title", entry.source.replaceAll("_", " ")),
        amount,
        element(
          "p",
          "coin-ledger-meta",
          `${formatDate(entry.created_at)} · Total ${formatCoins(entry.total_balance_before)} → ${formatCoins(entry.total_balance_after)}`
            + (entry.note ? ` · ${entry.note}` : ""),
        ),
      );
      ledger.append(item);
    });
  };

  const renderAttendance = (attendance) => {
    profilePanel.querySelector("[data-attendance-progress]").textContent =
      `${attendance.cycle_progress} / 7`;
    const days = profilePanel.querySelector("[data-attendance-days]");
    days.replaceChildren();
    attendance.cycle_days.forEach((day) => {
      const item = element(
        "li",
        `attendance-day${day.attended ? " is-earned" : ""}${day.is_today ? " is-today" : ""}`,
      );
      item.append(
        element("span", "attendance-day-label", `DAY ${day.day}`),
        element("strong", "attendance-day-reward", day.attended ? "+100" : "100"),
        element("span", "attendance-day-state", day.attended ? "Earned" : day.day === attendance.next_cycle_day ? "Next" : "Upcoming"),
      );
      if (day.attendance_date) {
        item.append(element("time", "attendance-day-date", day.attendance_date));
      }
      days.append(item);
    });

    attendanceButton.disabled = attendance.checked_in_today;
    attendanceButton.textContent = attendance.checked_in_today
      ? "Today's attendance recorded"
      : `Check in for ${formatCoins(attendance.today_reward)} Earned Coins`;
    attendanceStatus.textContent = attendance.checked_in_today
      ? `Attendance recorded for ${attendance.today} (Africa/Cairo), cycle day ${attendance.cycle_progress} of 7.`
      : `Today is ${attendance.today} in Africa/Cairo. Check in for day ${attendance.next_cycle_day}; a missed day restarts progress but never removes earned Coins.`;
    profilePanel.querySelector("[data-wallet-balance]").textContent =
      formatCoins(attendance.wallet.coin_balance);
    profilePanel.querySelector("[data-purchased-balance]").textContent =
      formatCoins(attendance.wallet.purchased_coin_balance);
    profilePanel.querySelector("[data-earned-balance]").textContent =
      formatCoins(attendance.wallet.earned_coin_balance);
  };

  const refreshAttendance = async () => {
    const response = await api("attendance/daily");
    renderAttendance(response.attendance);
  };

  const renderCoinCatalog = (packages, methods) => {
    const form = document.querySelector("#coin-order-form");
    const message = profilePanel.querySelector("[data-coins-config-message]");
    const packageSelect = form.elements.package_id;
    const methodSelect = form.elements.payment_method_id;
    packageSelect.replaceChildren();
    methodSelect.replaceChildren();
    packages.forEach((item) => {
      const option = element(
        "option",
        "",
        `${item.name} — ${formatCoins(item.coin_amount)} Coins · ${item.price} ${item.currency_code}`,
      );
      option.value = item.id;
      packageSelect.append(option);
    });
    methods.forEach((item) => {
      const option = element("option", "", item.display_name);
      option.value = item.id;
      methodSelect.append(option);
    });

    const updateInstructions = () => {
      const method = methods.find((item) => String(item.id) === methodSelect.value);
      profilePanel.querySelector("[data-payment-instructions]").textContent =
        method?.instructions || "Payment instructions are provided after this method is configured.";
    };
    methodSelect.addEventListener("change", updateInstructions);
    if (packages.length > 0 && methods.length > 0) {
      form.hidden = false;
      message.textContent = "";
      updateInstructions();
    } else {
      form.hidden = true;
      message.textContent = "Coin packages and payment methods are not configured yet.";
    }
  };

  const renderOrders = (orders) => {
    const list = profilePanel.querySelector("[data-coin-orders]");
    list.replaceChildren();
    if (orders.length === 0) {
      list.append(element("p", "account-copy", "No Coin purchase requests yet."));
      return;
    }

    orders.forEach((order) => {
      const card = element("article", "coin-order-card");
      card.append(
        element("p", "coin-order-title", `${order.package_name} · ${formatCoins(order.coin_amount)} Coins`),
        element(
          "p",
          "coin-order-meta",
          `${order.price} ${order.currency_code} · ${order.payment_method_name} · ${order.status.replaceAll("_", " ")}`,
        ),
        element("p", "coin-order-meta", `Request #${order.id} · ${formatDate(order.created_at)}`),
      );
      if (order.payment_reference || order.proof_details) {
        card.append(element(
          "p",
          "coin-order-meta",
          `Submitted payment details${order.payment_reference ? ` · Reference: ${order.payment_reference}` : ""}`
            + (order.proof_details ? ` · ${order.proof_details}` : ""),
        ));
      }
      if (order.review_reason) {
        card.append(element("p", "coin-order-meta", `Review: ${order.review_reason}`));
      }

      if (order.status === "awaiting_payment") {
        const evidenceForm = element("form", "coin-order-evidence");
        const referenceLabel = element("label", "account-field");
        referenceLabel.append(element("span", "", "Payment reference"));
        const referenceInput = element("input");
        referenceInput.name = "payment_reference";
        referenceInput.maxLength = 150;
        referenceLabel.append(referenceInput);
        const detailsLabel = element("label", "account-field");
        detailsLabel.append(element("span", "", "Payment evidence or details"));
        const detailsInput = element("textarea");
        detailsInput.name = "proof_details";
        detailsInput.maxLength = 4000;
        detailsInput.rows = 3;
        detailsLabel.append(detailsInput);
        const submit = element("button", "button button-primary account-submit", "Submit for review");
        submit.type = "submit";
        evidenceForm.append(referenceLabel, detailsLabel, submit);
        evidenceForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const paymentReference = referenceInput.value.trim();
          const proofDetails = detailsInput.value.trim();
          if (!paymentReference && !proofDetails) {
            showMessage("Enter a payment reference or payment details.", true);
            return;
          }
          try {
            await api(`coins/orders/${order.id}/evidence`, "POST", {
              payment_reference: paymentReference || null,
              proof_details: proofDetails || null,
              idempotency_key: idempotencyKey(),
            });
            await Promise.all([refreshCoinData(), refreshAttendance()]);
            showMessage("Payment details submitted for review. Coins are added only after approval.");
          } catch (error) {
            showMessage(error.message, true);
          }
        });
        card.append(evidenceForm);
      }
      list.append(card);
    });
  };

  const refreshCoinData = async () => {
    const [wallet, transactionData, packagesData, methodsData, orderData] = await Promise.all([
      api("wallet"),
      api("wallet/transactions?limit=30"),
      api("coins/packages"),
      api("coins/payment-methods"),
      api("coins/orders"),
    ]);
    renderWallet(wallet, transactionData.transactions);
    renderCoinCatalog(packagesData.packages, methodsData.payment_methods);
    renderOrders(orderData.orders);
  };

  const updateProfileView = async (user) => {
    const profileData = await Promise.all([
      api("users/me"),
    ]);
    const profile = profileData[0].profile;
    authPanel.hidden = true;
    profilePanel.hidden = false;
    tabs.hidden = true;
    const identity = profilePanel.querySelector("[data-identity]");
    identity.replaceChildren(
      element("span", "", profile.display_name || user.username),
      element("span", "", user.email),
      element(
        "span",
        `account-verification-state${profile.email_verified ? " is-verified" : ""}`,
        profile.email_verified ? "Email verified" : "Email not verified",
      ),
    );
    for (const field of ["display_name", "full_name", "avatar_url", "country", "bio"]) {
      forms.profile.elements[field].value = profile[field] || "";
    }
    await refreshCoinData();
    showMessage("");
  };

  const loadAccount = async () => {
    try {
      await ensureCsrf();
      if (resetToken) return;
      const response = await api("auth/me");
      await updateProfileView(response.user);
    } catch (error) {
      if (error.code === "AUTH_REQUIRED") {
        authPanel.hidden = false;
        profilePanel.hidden = true;
        setMode("login");
        return;
      }
      showMessage(error.message, true);
    }
  };

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  document.querySelector("[data-show-forgot]").addEventListener("click", () => setMode("forgot"));
  document.querySelector("[data-show-login]").addEventListener("click", () => setMode("login"));

  forms.login.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!forms.login.reportValidity()) return;
    const data = Object.fromEntries(new FormData(forms.login));
    try {
      const result = await api("auth/login", "POST", data);
      csrfToken = result.csrf_token;
      window.dispatchEvent(new Event("neen:authchange"));
      await updateProfileView(result.user);
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  forms.register.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!forms.register.reportValidity()) return;
    const data = Object.fromEntries(new FormData(forms.register));
    if (!data.display_name) delete data.display_name;
    try {
      await api("auth/register", "POST", data);
      forms.login.elements.email.value = data.email;
      forms.register.reset();
      setMode("login");
      showMessage("Your account is ready. Sign in to continue.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  forms.forgot.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!forms.forgot.reportValidity()) return;
    try {
      const result = await api("auth/password/forgot", "POST", {
        email: forms.forgot.elements.email.value,
      });
      showMessage(result.message);
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  forms.reset.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!forms.reset.reportValidity()) return;
    try {
      await api("auth/password/reset", "POST", {
        token: resetToken,
        password: forms.reset.elements.password.value,
      });
      window.dispatchEvent(new Event("neen:authchange"));
      resetToken = "";
      window.history.replaceState(null, "", window.location.pathname);
      forms.reset.reset();
      setMode("login");
      await requestCsrfToken();
      showMessage("Password updated. Sign in with your new password.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  forms.profile.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!forms.profile.reportValidity()) return;
    const data = Object.fromEntries(new FormData(forms.profile));
    for (const field of Object.keys(data)) {
      if (data[field] === "") data[field] = null;
    }
    try {
      const result = await api("users/me", "PATCH", data);
      const displayName = result.profile.display_name || result.profile.username;
      profilePanel.querySelector("[data-identity]").textContent =
        `${displayName} · ${result.profile.email}`;
      showMessage("Profile saved.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  document.querySelector("#coin-order-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await api("coins/orders", "POST", {
        package_id: Number(form.elements.package_id.value),
        payment_method_id: Number(form.elements.payment_method_id.value),
        idempotency_key: idempotencyKey(),
      });
      await refreshCoinData();
      showMessage("Payment request created. No Coins are added until payment is reviewed and approved.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  attendanceButton.addEventListener("click", async () => {
    attendanceButton.disabled = true;
    try {
      const result = await api("attendance/check-in", "POST", {});
      renderAttendance(result.attendance);
      await refreshCoinData();
      showMessage(result.created
        ? `Daily attendance claimed: +100 Earned Coins. Your balance is updated.`
        : "Today's attendance was already recorded. No duplicate Coins were added.");
    } catch (error) {
      attendanceButton.disabled = false;
      showMessage(error.message, true);
      try {
        await refreshAttendance();
      } catch (refreshError) {
        attendanceStatus.textContent = refreshError.message;
      }
    }
  });

  document.querySelector("[data-logout]").addEventListener("click", async () => {
    try {
      await api("auth/logout", "POST", {});
      window.dispatchEvent(new Event("neen:authchange"));
      await requestCsrfToken();
      authPanel.hidden = false;
      profilePanel.hidden = true;
      forms.login.reset();
      setMode("login");
      showMessage("You have signed out.");
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  if (resetToken) {
    window.history.replaceState(null, "", window.location.pathname);
    authPanel.hidden = false;
    profilePanel.hidden = true;
    setMode("reset");
  } else {
    setMode("login");
  }
  loadAccount();
})();
