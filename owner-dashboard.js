(() => {
  const app = document.querySelector("#owner-app");
  if (!(app instanceof HTMLElement)) return;

  const currentUserId = Number(app.dataset.currentUser);
  const panels = [...document.querySelectorAll("[data-panel]")];
  const navItems = [...document.querySelectorAll("[data-section]")];
  const state = { userPage: 1, activityPage: 1, userQuery: "", userStatus: "", userSort: "newest", activityQuery: "", selectedUser: null, language: "en" };
  const translations = {
    en: {
      overview: "Overview", users: "Users", wallet: "Wallet & Transactions", modules: "Connected Modules",
      activity: "Admin Activity", ownerVerified: "OWNER ROLE SERVER-VERIFIED", ownerDashboard: "Owner Dashboard",
      language: "Language", signOut: "Sign out", overviewDesc: "Current account, wallet, event, game, and order data from the connected database.",
      newAccounts: "New accounts", coinActivity: "Coins activity", rechargeOrders: "Recharge orders", eventVotes: "Event votes",
      recentUsers: "Recent registrations", viewUsers: "View users ↗", recentOrders: "Recent diamond orders",
      openAdmin: "Open admin modules ↗", recentActivity: "Recent admin activity", viewActivity: "View activity ↗",
      usersDesc: "Search, inspect, edit profile details, manage non-owner roles, and suspend accounts. Owner accounts and your own roles are protected.",
      searchUsers: "Search username, email, or ID", status: "Status", sort: "Sort", search: "Search", refresh: "Refresh",
      selectUser: "Select a user to review account and wallet details.", walletDesc: "Wallet changes use the existing transactional ledger, require a reason, prevent negative balances, and record an idempotency key.",
      walletAccount: "Wallet account", ledgerHistory: "Ledger history", selectWalletUser: "Select an account from Users to view its ledger and make a documented adjustment.",
      adjustCoins: "Adjust Coins", direction: "Direction", balanceType: "Balance type", amount: "Amount",
      reason: "Reason (required)", submitAdjustment: "Submit adjustment",
      adjustmentWarning: "Every adjustment is permanent in the ledger. Verify the account, balance type, amount, and reason before submitting.",
      modulesDesc: "Open the existing permission-checked administration console for modules already backed by services and database records.",
      existingAdmin: "Existing Admin Dashboard", existingAdminDesc: "Games, rewards, attendance, community events, diamond packages and orders, Coins packages and orders.",
      openConsole: "Open console ↗", charts: "Extended reports",
      reportsScope: "The Overview charts are real 30-day database series. Additional reporting dimensions are not yet implemented.",
      notAvailable: "Not available", activityDesc: "Central, read-only view of recorded administrative actions, actor, entity, available metadata, IP address, and timestamp.",
      searchActivity: "Search actor or action", account: "Account", email: "Email", created: "Registered", lastActive: "Last active",
      coins: "Coins", diamonds: "Diamonds", roles: "Roles", actions: "Actions", manage: "Manage",
      page: "Page", of: "of", previous: "Previous", next: "Next", noResults: "No records found.",
      loading: "Loading…", active: "Active", suspended: "Suspended", suspend: "Suspend", activate: "Activate",
      profile: "Profile", saveProfile: "Save profile", fullName: "Full name", displayName: "Display name",
      country: "Country", bio: "Bio", accessRoles: "Access roles", grant: "Grant", revoke: "Revoke",
      selectRole: "Select role", ownerProtected: "Owner accounts are protected from account and role changes.",
      cannotSelf: "You cannot change your own account status or roles.", accountStatus: "Account status", coinBalance: "Total Coins",
      purchased: "Purchased", earned: "Earned", diamondBalance: "Diamonds", transactions: "Recent transactions",
      operation: "Operation", balance: "Balance", source: "Source", date: "Date (UTC)", actor: "Actor",
      entity: "Entity", metadata: "Metadata", ipAddress: "IP address", time: "Time (UTC)", noTransactions: "No Coins ledger entries for this account.",
      noActivity: "No audit entries are available.", noUsers: "No users matched this search.",
      confirmSuspend: "Suspend this account? All active sessions will be revoked.",
      confirmActivate: "Reactivate this account?", confirmRole: "Apply this role change?",
      confirmAdjustment: "Submit this Coins adjustment? This operation will be recorded in the ledger and audit log.",
      saved: "Saved successfully.", failed: "The operation failed.", requestError: "The server returned an error.",
      invalidResponse: "The server returned an unreadable response.", csrfMissing: "Could not obtain a CSRF token. Sign in again.",
      recentRegistrations: "Recent registrations", recentDiamondOrders: "Recent diamond orders",
      playerId: "Player ID", orderNumber: "Order #", paymentStatus: "Order status",
      grossVolume: "Gross ledger volume", eventsActive: "Active events", votesTotal: "Votes", claims: "Reward claims",
      rewards: "Event rewards", checkIns: "Attendance check-ins", gamesActive: "Active games", walletTransactions: "Wallet transactions",
      gamesRewards: "Games & Rewards", gameSettingsNote: "The daily free-attempt limit and verified-win Coins reward are connected to the game runtime. Board size, paid attempts, and other hard-coded rules are not editable here.",
      gameName: "Game name", gameDescription: "Description", dailyFreeAttempts: "Free attempts per day",
      winReward: "Coins per verified win", gameState: "Publication status", saveGame: "Save game settings",
      confirmGame: "Save these game settings? Changes take effect in the game runtime.",
      siteSettings: "Site Settings", tiktokProfile: "TikTok profile URL", siteDescription: "Site description",
      saveSettings: "Save site settings", contentManagement: "Content Management",
      notConnected: "Videos, gallery assets, and page copy remain static files. No CMS editing controls are exposed.",
      requiresIntegration: "Requires a media workflow and public-page integration",
      totalUsers: "Total users", newUsers: "New accounts (30d)", activeUsers: "Active users (30d)",
      totalCoins: "Coins in wallets", totalOrders: "Diamond orders", pendingOrders: "Open diamond orders",
      cancel: "Cancel", networkError: "Request could not be completed. Check your connection and try again.",
    },
    ar: {
      overview: "نظرة عامة", users: "المستخدمون", wallet: "المحفظة والمعاملات", modules: "الأنظمة المتصلة",
      activity: "سجل نشاط الإدارة", ownerVerified: "تم التحقق من صلاحية المالك", ownerDashboard: "لوحة المالك",
      language: "اللغة", signOut: "تسجيل الخروج", overviewDesc: "بيانات الحساب والمحفظة والفعاليات والألعاب والطلبات من قاعدة البيانات.",
      newAccounts: "الحسابات الجديدة", coinActivity: "نشاط العملات", rechargeOrders: "طلبات الشحن", eventVotes: "أصوات الفعاليات",
      recentUsers: "أحدث التسجيلات", viewUsers: "عرض المستخدمين ↗", recentOrders: "أحدث طلبات الجواهر",
      openAdmin: "فتح أقسام الإدارة ↗", recentActivity: "أحدث نشاط إداري", viewActivity: "عرض السجل ↗",
      usersDesc: "ابحث عن الحسابات وراجعها وعدّل بيانات الملف الشخصي وأدر الأدوار غير المخصصة للمالك وأوقف الحسابات. حساب المالك وأدوارك محمية.",
      searchUsers: "بحث باسم المستخدم أو البريد أو الرقم", status: "الحالة", sort: "الترتيب", search: "بحث", refresh: "تحديث",
      selectUser: "اختر مستخدمًا لمراجعة الحساب والمحفظة.", walletDesc: "تُنفذ تغييرات المحفظة عبر سجل المعاملات الحالي مع سبب إلزامي ومنع الرصيد السالب ومفتاح منع التكرار.",
      walletAccount: "محفظة المستخدم", ledgerHistory: "سجل المعاملات", selectWalletUser: "اختر حسابًا من المستخدمين لعرض سجله وإجراء تعديل موثق.",
      adjustCoins: "تعديل العملات", direction: "العملية", balanceType: "نوع الرصيد", amount: "الكمية",
      reason: "السبب (إلزامي)", submitAdjustment: "تنفيذ التعديل",
      adjustmentWarning: "يُسجل كل تعديل نهائيًا. تحقق من الحساب ونوع الرصيد والكمية والسبب قبل التنفيذ.",
      modulesDesc: "افتح لوحة الإدارة الحالية المحمية بالصلاحيات لإدارة الأنظمة المرتبطة بالخدمات وقاعدة البيانات.",
      existingAdmin: "لوحة الإدارة الحالية", existingAdminDesc: "الألعاب والمكافآت والحضور والفعاليات وباقات الجواهر وطلباتها وباقات Coins وطلباتها.",
      openConsole: "فتح لوحة الإدارة ↗", charts: "تقارير إضافية",
      reportsScope: "المخططات في النظرة العامة مبنية على بيانات حقيقية لآخر 30 يومًا. لم تنفذ أبعاد تقارير أخرى بعد.",
      notAvailable: "غير متاح", activityDesc: "سجل مركزي للقراءة فقط يعرض العمليات الإدارية والمنفذ والكيان والبيانات المتاحة وعنوان الشبكة والتوقيت.",
      searchActivity: "بحث بالمنفذ أو العملية", account: "الحساب", email: "البريد", created: "تاريخ التسجيل", lastActive: "آخر نشاط",
      coins: "Coins", diamonds: "جواهر", roles: "الأدوار", actions: "إجراءات", manage: "إدارة",
      page: "صفحة", of: "من", previous: "السابق", next: "التالي", noResults: "لا توجد سجلات.",
      loading: "جارٍ التحميل…", active: "نشط", suspended: "موقوف", suspend: "إيقاف", activate: "تفعيل",
      profile: "الملف الشخصي", saveProfile: "حفظ الملف", fullName: "الاسم الكامل", displayName: "اسم العرض",
      country: "الدولة", bio: "نبذة", accessRoles: "صلاحيات الوصول", grant: "منح", revoke: "إلغاء",
      selectRole: "اختر دورًا", ownerProtected: "حسابات المالك محمية من تعديل الحساب والأدوار.",
      cannotSelf: "لا يمكنك تغيير حالة حسابك أو أدوارك.", accountStatus: "حالة الحساب", coinBalance: "إجمالي Coins",
      purchased: "مشتراة", earned: "مكتسبة", diamondBalance: "الجواهر", transactions: "أحدث المعاملات",
      operation: "العملية", balance: "الرصيد", source: "المصدر", date: "التاريخ (UTC)", actor: "المنفذ",
      entity: "الكيان", metadata: "البيانات", ipAddress: "عنوان IP", time: "التوقيت (UTC)", noTransactions: "لا توجد معاملات Coins لهذا الحساب.",
      noActivity: "لا توجد سجلات نشاط.", noUsers: "لا يوجد مستخدمون يطابقون البحث.",
      confirmSuspend: "إيقاف هذا الحساب؟ سيتم إبطال جميع الجلسات النشطة.",
      confirmActivate: "إعادة تفعيل هذا الحساب؟", confirmRole: "تأكيد تغيير الدور؟",
      confirmAdjustment: "تنفيذ تعديل Coins؟ سيُسجل في دفتر المحفظة وسجل الإدارة.",
      saved: "تم الحفظ بنجاح.", failed: "تعذر تنفيذ العملية.", requestError: "أعاد الخادم خطأ.",
      invalidResponse: "تعذر قراءة استجابة الخادم.", csrfMissing: "تعذر الحصول على رمز الحماية. سجّل الدخول مجددًا.",
      recentRegistrations: "أحدث التسجيلات", recentDiamondOrders: "أحدث طلبات الجواهر",
      playerId: "معرف اللاعب", orderNumber: "رقم الطلب", paymentStatus: "حالة الطلب",
      grossVolume: "إجمالي حجم المعاملات", eventsActive: "الفعاليات النشطة", votesTotal: "الأصوات", claims: "مطالبات المكافآت",
      rewards: "مكافآت الفعاليات", checkIns: "تسجيلات الحضور", gamesActive: "الألعاب النشطة", walletTransactions: "معاملات المحفظة",
      gamesRewards: "الألعاب والمكافآت", gameSettingsNote: "حد المحاولات المجانية اليومي ومكافأة الفوز التي يتحقق منها الخادم مرتبطان بمحرك اللعبة. حجم اللوحة والمحاولات المدفوعة والقواعد الثابتة غير قابلة للتعديل هنا.",
      gameName: "اسم اللعبة", gameDescription: "الوصف", dailyFreeAttempts: "المحاولات المجانية يوميًا",
      winReward: "Coins للفوز المتحقق", gameState: "حالة النشر", saveGame: "حفظ إعدادات اللعبة",
      confirmGame: "حفظ إعدادات اللعبة؟ ستطبق التغييرات مباشرة في نظام اللعبة.",
      siteSettings: "إعدادات الموقع", tiktokProfile: "رابط حساب TikTok", siteDescription: "وصف الموقع",
      saveSettings: "حفظ إعدادات الموقع", contentManagement: "إدارة المحتوى",
      notConnected: "الفيديوهات وملفات المعرض ونصوص الصفحات ملفات ثابتة. لا توجد أدوات تعديل CMS شكلية.",
      requiresIntegration: "يتطلب نظامًا للوسائط وربط الصفحات العامة",
      totalUsers: "إجمالي المستخدمين", newUsers: "حسابات جديدة (30 يومًا)", activeUsers: "مستخدمون نشطون (30 يومًا)",
      totalCoins: "Coins في المحافظ", totalOrders: "طلبات الجواهر", pendingOrders: "طلبات جواهر مفتوحة",
      cancel: "إلغاء", networkError: "تعذر إكمال الطلب. تحقق من الاتصال وحاول مجددًا.",
    },
  };

  const t = (key) => translations[state.language][key] ?? translations.en[key] ?? key;
  const make = (tag, className = "", text = undefined) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const showState = (container, message, error = false) => {
    container.replaceChildren(make("p", `admin-state${error ? " is-error" : ""}`, message));
  };
  const formatDate = (value) => typeof value === "string" && value !== "" ? value.replace("T", " ").replace(/\.\d+Z$/, " UTC") : "—";
  const toast = (message, error = false) => {
    const element = document.querySelector("[data-owner-toast]");
    if (!(element instanceof HTMLElement)) return;
    element.textContent = message;
    element.classList.toggle("is-error", error);
    element.classList.add("is-visible");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => element.classList.remove("is-visible"), 4000);
  };

  const apiRequest = async (path, options = {}) => {
    let response;
    try {
      response = await fetch(path, {
        ...options,
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.headers ?? {}),
        },
      });
    } catch {
      throw new Error(t("networkError"));
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error(t("invalidResponse"));
    }
    if (!response.ok || result.success !== true) {
      const message = result.errors?.[0]?.message;
      throw new Error(typeof message === "string" ? message : `${t("requestError")} (${response.status})`);
    }
    return result.data;
  };

  const mutate = async (path, method, payload) => {
    const csrf = await apiRequest("/api/auth/csrf");
    if (typeof csrf.csrf_token !== "string") throw new Error(t("csrfMissing"));
    return apiRequest(path, {
      method,
      headers: { "X-CSRF-Token": csrf.csrf_token },
      body: JSON.stringify(payload),
    });
  };

  const buildTable = (headers, rows) => {
    const wrapper = make("div", "admin-table-wrap");
    const table = make("table", "admin-table");
    const head = make("thead");
    const headRow = make("tr");
    headers.forEach((label) => headRow.append(make("th", "", label)));
    head.append(headRow);
    const body = make("tbody");
    rows.forEach((row) => body.append(row));
    table.append(head, body);
    wrapper.append(table);
    return wrapper;
  };

  const addPagination = (container, pagination, onPage) => {
    container.replaceChildren();
    if (!pagination || pagination.pages <= 1) return;
    const previous = make("button", "", t("previous"));
    previous.type = "button";
    previous.disabled = pagination.page <= 1;
    previous.addEventListener("click", () => onPage(pagination.page - 1));
    const label = make("span", "", `${t("page")} ${pagination.page} ${t("of")} ${pagination.pages} · ${pagination.total}`);
    const next = make("button", "", t("next"));
    next.type = "button";
    next.disabled = pagination.page >= pagination.pages;
    next.addEventListener("click", () => onPage(pagination.page + 1));
    container.append(previous, label, next);
  };

  const openSection = (section) => {
    navItems.forEach((item) => {
      const active = item.dataset.section === section;
      item.classList.toggle("is-active", active);
      if (active) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    panels.forEach((panel) => {
      const active = panel.dataset.panel === section;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    if (section === "overview") loadOverview();
    if (section === "users") loadUsers();
    if (section === "activity") loadActivity();
    if (section === "modules") {
      loadGames();
      loadSiteSettings();
    }
  };

  const renderChart = (container, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      showState(container, t("noResults"));
      return;
    }
    const values = rows.map((row) => Number(row.value) || 0);
    const max = Math.max(...values, 1);
    container.replaceChildren();
    rows.slice(-30).forEach((row) => {
      const column = make("span", "owner-chart-bar");
      const value = Number(row.value) || 0;
      column.title = `${row.day}: ${value}`;
      const bar = make("i");
      bar.style.height = `${Math.max(2, value / max * 100)}%`;
      bar.setAttribute("aria-label", `${row.day}: ${value}`);
      const amount = make("b", "owner-chart-tooltip", value);
      const day = make("small", "", String(row.day).slice(5));
      column.append(bar, amount, day);
      container.append(column);
    });
  };

  const renderCompactRows = (container, rows, type) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      showState(container, t("noResults"));
      return;
    }
    const list = make("div", "owner-compact-list");
    rows.forEach((item) => {
      const row = make("div", "owner-compact-item");
      const main = make("span");
      if (type === "users") {
        main.append(make("strong", "", item.username));
        main.append(make("small", "", `${t("account")} #${item.id} · ${item.status} · ${formatDate(item.created_at)}`));
        const action = make("button", "owner-table-action", t("manage"));
        action.type = "button";
        action.addEventListener("click", () => selectUser(item.id, "users"));
        row.append(main, action);
      } else if (type === "orders") {
        main.append(make("strong", "", `${item.order_number} · ${item.username}`));
        main.append(make("small", "", `${t("playerId")} ${item.player_id} · ${item.diamond_amount} · ${formatDate(item.created_at)}`));
        row.append(main, make("span", "", item.order_status));
      } else {
        main.append(make("strong", "", `${item.action_type} · ${item.actor_username ?? "System"}`));
        main.append(make("small", "", `${item.entity_type} #${item.entity_id ?? "—"} · ${formatDate(item.created_at)}`));
        row.append(main);
      }
      list.append(row);
    });
    container.replaceChildren(list);
  };

  const loadOverview = async () => {
    const stats = document.querySelector("[data-owner-stats]");
    if (!(stats instanceof HTMLElement)) return;
    showState(stats, t("loading"));
    try {
      const { overview } = await apiRequest("/api/owner/dashboard");
      const count = overview.counts;
      const values = [
        ["totalUsers", count.users_total],
        ["newUsers", count.users_new_30d],
        ["activeUsers", count.users_active_30d],
        ["totalCoins", count.coins_circulating],
        ["walletTransactions", count.wallet_transactions_total],
        ["totalOrders", count.diamond_orders_total],
        ["pendingOrders", count.diamond_orders_pending],
        ["eventsActive", `${count.events_active} / ${count.events_total}`],
        ["votesTotal", count.event_votes_total],
        ["rewards", count.event_rewards_total],
        ["claims", count.homepage_reward_claims],
        ["checkIns", count.attendance_checkins],
        ["gamesActive", `${count.games_active} / ${count.games_total}`],
      ];
      const cards = values.map(([label, value]) => {
        const card = make("article", "owner-stat-card");
        card.append(make("span", "", t(label)), make("strong", "", value));
        return card;
      });
      stats.replaceChildren(...cards);
      for (const key of ["users", "wallet_transactions", "diamond_orders", "event_votes"]) {
        const chart = document.querySelector(`[data-chart="${key}"]`);
        if (chart instanceof HTMLElement) renderChart(chart, overview.series[key]);
      }
      renderCompactRows(document.querySelector("[data-recent-users]"), overview.recent_users, "users");
      renderCompactRows(document.querySelector("[data-recent-orders]"), overview.recent_diamond_orders, "orders");
      renderCompactRows(document.querySelector("[data-recent-activity]"), overview.recent_activity, "activity");
    } catch (error) {
      showState(stats, error instanceof Error ? error.message : t("failed"), true);
    }
  };

  const loadUsers = async (page = state.userPage) => {
    const container = document.querySelector("[data-owner-users]");
    const pagination = document.querySelector("[data-owner-pagination]");
    if (!(container instanceof HTMLElement) || !(pagination instanceof HTMLElement)) return;
    state.userPage = page;
    showState(container, t("loading"));
    try {
      const query = new URLSearchParams({ page: String(page), sort: state.userSort });
      if (state.userQuery) query.set("q", state.userQuery);
      if (state.userStatus) query.set("status", state.userStatus);
      const result = await apiRequest(`/api/owner/users?${query}`);
      if (result.users.length === 0) showState(container, t("noUsers"));
      else {
        const rows = result.users.map((user) => {
          const row = make("tr");
          const account = make("td");
          account.append(make("strong", "", user.username));
          account.append(make("small", "", `${t("account")} #${user.id} · ${user.status}`));
          row.append(account, make("td", "", user.email));
          row.append(make("td", "", formatDate(user.created_at)));
          row.append(make("td", "", formatDate(user.last_login_at)));
          row.append(make("td", "", user.coin_balance.toLocaleString()));
          row.append(make("td", "", user.diamond_balance.toLocaleString()));
          row.append(make("td", "", user.roles.join(", ") || "—"));
          const action = make("td");
          const button = make("button", "owner-table-action", t("manage"));
          button.type = "button";
          button.addEventListener("click", () => selectUser(user.id, "users"));
          action.append(button);
          row.append(action);
          return row;
        });
        container.replaceChildren(buildTable(
          [t("account"), t("email"), t("created"), t("lastActive"), t("coins"), t("diamonds"), t("roles"), t("actions")],
          rows,
        ));
      }
      addPagination(pagination, result.pagination, loadUsers);
    } catch (error) {
      showState(container, error instanceof Error ? error.message : t("failed"), true);
    }
  };

  const addDetailField = (form, label, name, value, maxLength, wide = false, multiline = false) => {
    const field = make("label", wide ? "owner-profile-wide" : "", label);
    const input = document.createElement(multiline ? "textarea" : "input");
    input.name = name;
    input.maxLength = maxLength;
    input.value = typeof value === "string" ? value : "";
    field.append(input);
    form.append(field);
  };

  const renderTransactions = (container, entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      showState(container, t("noTransactions"));
      return;
    }
    const rows = entries.map((entry) => {
      const row = make("tr");
      row.append(make("td", "", `${entry.operation_type} · ${entry.amount} ${entry.balance_type}`));
      row.append(make("td", "", `${entry.balance_before} → ${entry.balance_after} (${entry.total_balance_before} → ${entry.total_balance_after})`));
      row.append(make("td", "", entry.source));
      row.append(make("td", "", formatDate(entry.created_at)));
      return row;
    });
    container.replaceChildren(buildTable([t("operation"), t("balance"), t("source"), t("date")], rows));
  };

  const renderUserDetails = (user) => {
    const container = document.querySelector("[data-owner-user-detail]");
    const walletAccount = document.querySelector("[data-owner-wallet-account]");
    const ledger = document.querySelector("[data-owner-ledger]");
    if (!(container instanceof HTMLElement) || !(walletAccount instanceof HTMLElement) || !(ledger instanceof HTMLElement)) return;
    const card = make("div");
    const heading = make("div", "owner-detail-heading");
    const identity = make("div");
    identity.append(make("h3", "", `${user.username} · ${t("account")} #${user.id}`));
    identity.append(make("p", "", `${user.email} · ${user.email_verified ? "verified" : "not verified"} · ${t("lastActive")}: ${formatDate(user.last_login_at)}`));
    heading.append(identity, make("span", "admin-status-pill", user.status));
    card.append(heading);
    const grid = make("div", "owner-detail-grid");

    const profileSection = make("section");
    profileSection.append(make("h4", "", t("profile")));
    const profileForm = make("form", "owner-profile-form");
    profileForm.dataset.ownerProfile = String(user.id);
    addDetailField(profileForm, t("fullName"), "full_name", user.full_name, 150);
    addDetailField(profileForm, t("displayName"), "display_name", user.display_name, 80);
    addDetailField(profileForm, t("country"), "country", user.country, 80);
    addDetailField(profileForm, t("bio"), "bio", user.bio, 2000, true, true);
    const save = make("button", "admin-secondary-button", t("saveProfile"));
    save.type = "submit";
    profileForm.append(save);
    profileSection.append(profileForm);

    const accessSection = make("section");
    accessSection.append(make("h4", "", t("accessRoles")));
    const roleList = make("div", "owner-role-list");
    user.roles.forEach((role) => roleList.append(make("span", "owner-role-pill", role)));
    accessSection.append(roleList);
    if (user.roles.includes("owner")) {
      accessSection.append(make("p", "owner-warning", t("ownerProtected")));
    } else {
      const roleForm = make("form", "owner-role-form");
      roleForm.dataset.ownerRoles = String(user.id);
      const roleLabel = make("label", "", t("selectRole"));
      const roleSelect = document.createElement("select");
      roleSelect.name = "role";
      ["moderator", "game_admin", "support_admin", "super_admin"].forEach((role) => {
        const option = make("option", "", role);
        option.value = role;
        roleSelect.append(option);
      });
      roleLabel.append(roleSelect);
      const operationLabel = make("label", "", t("accessRoles"));
      const operation = document.createElement("select");
      operation.name = "operation";
      [["grant", t("grant")], ["revoke", t("revoke")]].forEach(([value, label]) => {
        const option = make("option", "", label);
        option.value = value;
        operation.append(option);
      });
      operationLabel.append(operation);
      const submit = make("button", "admin-secondary-button", t("saveProfile"));
      submit.type = "submit";
      roleForm.append(roleLabel, operationLabel, submit);
      accessSection.append(roleForm);
    }
    if (user.id === currentUserId) {
      accessSection.append(make("p", "owner-warning", t("cannotSelf")));
    } else if (!user.roles.includes("owner")) {
      const statusActions = make("div", "owner-status-actions");
      const statusButton = make(
        user.status === "active" ? "button" : "button",
        user.status === "active" ? "admin-danger-button" : "admin-primary-button",
        user.status === "active" ? t("suspend") : t("activate"),
      );
      statusButton.type = "button";
      statusButton.dataset.ownerStatus = String(user.id);
      statusButton.dataset.nextStatus = user.status === "active" ? "suspended" : "active";
      statusActions.append(statusButton);
      accessSection.append(make("h4", "", t("accountStatus")), statusActions);
    }

    const walletSection = make("section");
    walletSection.append(make("h4", "", t("walletAccount")));
    const walletSummary = make("div", "owner-wallet-summary");
    for (const [label, value] of [
      [t("coinBalance"), user.coin_balance ?? 0],
      [t("purchased"), user.purchased_coin_balance ?? 0],
      [t("earned"), user.earned_coin_balance ?? 0],
      [t("diamondBalance"), user.diamond_balance ?? 0],
    ]) walletSummary.append(make("span", "", `${label}: ${Number(value).toLocaleString()}`));
    walletSection.append(walletSummary);

    const activitySection = make("section");
    activitySection.append(make("h4", "", t("transactions")));
    const transactionPreview = make("div");
    renderTransactions(transactionPreview, user.recent_transactions);
    activitySection.append(transactionPreview);

    const auditSection = make("section");
    auditSection.append(make("h4", "", t("recentActivity")));
    const auditRows = Array.isArray(user.recent_admin_activity) ? user.recent_admin_activity : [];
    if (auditRows.length === 0) {
      auditSection.append(make("p", "admin-state", t("noActivity")));
    } else {
      const list = make("div", "owner-compact-list");
      auditRows.forEach((entry) => {
        const row = make("div", "owner-compact-item");
        const description = make("span");
        description.append(make("strong", "", `${entry.action_type} · ${entry.actor_username ?? "System"}`));
        description.append(make("small", "", entry.payload ? JSON.stringify(entry.payload) : `${entry.entity_type} #${entry.entity_id ?? "—"}`));
        row.append(description, make("span", "", formatDate(entry.created_at)));
        list.append(row);
      });
      auditSection.append(list);
    }

    grid.append(profileSection, accessSection, walletSection, activitySection, auditSection);
    card.append(grid);
    container.replaceChildren(card);
    walletAccount.replaceChildren(make("p", "admin-state", `${user.username} · ${t("account")} #${user.id} · ${user.coin_balance ?? 0} ${t("coins")}`));
    renderTransactions(ledger, user.recent_transactions);
    state.selectedUser = user;
  };

  const selectUser = async (userId, section = "users") => {
    openSection(section);
    const container = document.querySelector("[data-owner-user-detail]");
    if (!(container instanceof HTMLElement)) return;
    showState(container, t("loading"));
    try {
      const { user } = await apiRequest(`/api/owner/users/${userId}`);
      renderUserDetails(user);
    } catch (error) {
      showState(container, error instanceof Error ? error.message : t("failed"), true);
    }
  };

  const loadActivity = async (page = state.activityPage) => {
    const container = document.querySelector("[data-owner-activity]");
    const pagination = document.querySelector("[data-owner-activity-pagination]");
    if (!(container instanceof HTMLElement) || !(pagination instanceof HTMLElement)) return;
    state.activityPage = page;
    showState(container, t("loading"));
    try {
      const query = new URLSearchParams({ page: String(page) });
      if (state.activityQuery) query.set("q", state.activityQuery);
      const result = await apiRequest(`/api/owner/activity?${query}`);
      if (result.entries.length === 0) showState(container, t("noActivity"));
      else {
        const rows = result.entries.map((entry) => {
          const row = make("tr");
          row.append(make("td", "", `${entry.actor_username ?? "System"} · ${entry.actor_role ?? "—"}`));
          row.append(make("td", "", entry.action_type));
          row.append(make("td", "", `${entry.entity_type} #${entry.entity_id ?? "—"}`));
          const metadata = make("td", "owner-metadata", entry.payload ? JSON.stringify(entry.payload) : "—");
          metadata.title = metadata.textContent;
          row.append(metadata);
          row.append(make("td", "", entry.ip_address ?? "—"));
          row.append(make("td", "", formatDate(entry.created_at)));
          return row;
        });
        container.replaceChildren(buildTable(
          [t("actor"), t("operation"), t("entity"), t("metadata"), t("ipAddress"), t("time")],
          rows,
        ));
      }
      addPagination(pagination, result.pagination, loadActivity);
    } catch (error) {
      showState(container, error instanceof Error ? error.message : t("failed"), true);
    }
  };

  const loadGames = async () => {
    const container = document.querySelector("[data-owner-games]");
    if (!(container instanceof HTMLElement)) return;
    showState(container, t("loading"));
    try {
      const { games } = await apiRequest("/api/owner/games");
      if (!Array.isArray(games) || games.length === 0) {
        showState(container, t("noResults"));
        return;
      }
      const cards = games.map((game) => {
        const card = make("article", "owner-game-card");
        const heading = make("div", "admin-module-heading");
        heading.append(make("h3", "", game.name), make("span", "admin-status-pill", game.status));
        card.append(heading);
        const form = make("form", "owner-game-form");
        form.dataset.ownerGame = String(game.id);
        const addField = (labelText, name, value, type = "text", max = null) => {
          const label = make("label", "", labelText);
          const input = document.createElement(type === "textarea" ? "textarea" : "input");
          if (type !== "textarea") input.type = type;
          input.name = name;
          input.value = value ?? "";
          if (max !== null) input.maxLength = max;
          if (type === "number") {
            input.min = name === "free_attempt_limit" ? "0" : "1";
            input.max = "100000000";
            input.step = "1";
            input.required = true;
          }
          label.append(input);
          form.append(label);
        };
        addField(t("gameName"), "name", game.name, "text", 100);
        addField(t("gameDescription"), "description", game.description ?? "", "textarea", 2000);
        addField(t("dailyFreeAttempts"), "free_attempt_limit", game.free_attempt_limit, "number");
        addField(t("winReward"), "reward_amount_coins", game.reward_amount_coins, "number");
        const statusLabel = make("label", "", t("gameState"));
        const status = document.createElement("select");
        status.name = "status";
        ["active", "disabled", "maintenance"].forEach((value) => {
          const option = make("option", "", value);
          option.value = value;
          option.selected = value === game.status;
          status.append(option);
        });
        statusLabel.append(status);
        form.append(statusLabel);
        const submit = make("button", "admin-primary-button", t("saveGame"));
        submit.type = "submit";
        form.append(submit);
        card.append(form);
        return card;
      });
      container.replaceChildren(...cards);
    } catch (error) {
      showState(container, error instanceof Error ? error.message : t("failed"), true);
    }
  };

  const loadSiteSettings = async () => {
    const form = document.querySelector("[data-owner-site-settings]");
    const updated = document.querySelector("[data-owner-settings-updated]");
    if (!(form instanceof HTMLFormElement) || !(updated instanceof HTMLElement)) return;
    try {
      const { settings } = await apiRequest("/api/owner/site-settings");
      for (const key of ["tiktok_url", "site_description"]) {
        const field = form.elements.namedItem(key);
        if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
          field.value = settings[key]?.value ?? "";
        }
      }
      updated.textContent = "";
    } catch (error) {
      updated.textContent = error instanceof Error ? error.message : t("failed");
      updated.classList.add("is-error");
    }
  };

  const refreshSelected = async () => {
    if (!state.selectedUser) return;
    await selectUser(state.selectedUser.id, "users");
  };

  navItems.forEach((item) => item.addEventListener("click", () => openSection(item.dataset.section)));
  document.querySelectorAll("[data-open-section]").forEach((button) => {
    button.addEventListener("click", () => openSection(button.dataset.openSection));
  });

  const userForm = document.querySelector("[data-owner-user-search]");
  if (userForm instanceof HTMLFormElement) {
    userForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const values = new FormData(userForm);
      state.userQuery = String(values.get("q") ?? "").trim();
      state.userStatus = String(values.get("status") ?? "");
      state.userSort = String(values.get("sort") ?? "newest");
      loadUsers(1);
    });
  }
  document.querySelector("[data-owner-users-refresh]")?.addEventListener("click", () => {
    if (userForm instanceof HTMLFormElement) userForm.reset();
    state.userQuery = "";
    state.userStatus = "";
    state.userSort = "newest";
    loadUsers(1);
  });

  const activityForm = document.querySelector("[data-owner-activity-search]");
  if (activityForm instanceof HTMLFormElement) {
    activityForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.activityQuery = String(new FormData(activityForm).get("q") ?? "").trim();
      loadActivity(1);
    });
  }
  document.querySelector("[data-owner-activity-refresh]")?.addEventListener("click", () => {
    if (activityForm instanceof HTMLFormElement) activityForm.reset();
    state.activityQuery = "";
    loadActivity(1);
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.matches("[data-owner-profile]")) {
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form).entries());
      const userId = form.dataset.ownerProfile;
      try {
        await mutate(`/api/owner/users/${userId}/profile`, "PATCH", fields);
        toast(t("saved"));
        await Promise.all([refreshSelected(), loadOverview()]);
      } catch (error) {
        toast(error instanceof Error ? error.message : t("failed"), true);
      }
    }
    if (form.matches("[data-owner-roles]")) {
      event.preventDefault();
      if (!window.confirm(t("confirmRole"))) return;
      const fields = new FormData(form);
      try {
        await mutate(`/api/owner/users/${form.dataset.ownerRoles}/roles`, "PATCH", {
          role: String(fields.get("role")),
          operation: String(fields.get("operation")),
        });
        toast(t("saved"));
        await Promise.all([refreshSelected(), loadUsers(), loadOverview()]);
      } catch (error) {
        toast(error instanceof Error ? error.message : t("failed"), true);
      }
    }
    if (form.matches("[data-owner-adjustment]")) {
      event.preventDefault();
      if (!state.selectedUser) {
        toast(t("selectWalletUser"), true);
        return;
      }
      if (!window.confirm(t("confirmAdjustment"))) return;
      const fields = new FormData(form);
      try {
        await mutate(`/api/admin/wallets/${state.selectedUser.id}/adjustments`, "POST", {
          direction: String(fields.get("direction")),
          balance_type: String(fields.get("balance_type")),
          amount: Number(fields.get("amount")),
          reason: String(fields.get("reason")).trim(),
          idempotency_key: `owner-wallet-${crypto.randomUUID()}`,
        });
        form.reset();
        toast(t("saved"));
        await Promise.all([refreshSelected(), loadOverview()]);
      } catch (error) {
        toast(error instanceof Error ? error.message : t("failed"), true);
      }
    }
    if (form.matches("[data-owner-game]")) {
      event.preventDefault();
      if (!window.confirm(t("confirmGame"))) return;
      const fields = new FormData(form);
      try {
        await mutate(`/api/owner/games/${form.dataset.ownerGame}`, "PATCH", {
          name: String(fields.get("name")).trim(),
          description: String(fields.get("description")).trim(),
          status: String(fields.get("status")),
          free_attempt_limit: Number(fields.get("free_attempt_limit")),
          reward_amount_coins: Number(fields.get("reward_amount_coins")),
        });
        toast(t("saved"));
        await Promise.all([loadGames(), loadOverview()]);
      } catch (error) {
        toast(error instanceof Error ? error.message : t("failed"), true);
      }
    }
    if (form.matches("[data-owner-site-settings]")) {
      event.preventDefault();
      const fields = new FormData(form);
      try {
        await mutate("/api/owner/site-settings", "PATCH", {
          tiktok_url: String(fields.get("tiktok_url")).trim(),
          site_description: String(fields.get("site_description")).trim(),
        });
        toast(t("saved"));
        await loadSiteSettings();
      } catch (error) {
        toast(error instanceof Error ? error.message : t("failed"), true);
      }
    }
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-owner-status]");
    if (!(button instanceof HTMLButtonElement)) return;
    const status = button.dataset.nextStatus;
    const question = status === "suspended" ? t("confirmSuspend") : t("confirmActivate");
    if (!window.confirm(question)) return;
    button.disabled = true;
    try {
      await mutate(`/api/owner/users/${button.dataset.ownerStatus}/status`, "PATCH", { status });
      toast(t("saved"));
      await Promise.all([refreshSelected(), loadUsers(), loadOverview()]);
    } catch (error) {
      toast(error instanceof Error ? error.message : t("failed"), true);
    } finally {
      button.disabled = false;
    }
  });

  const languageSelect = document.querySelector("[data-owner-language]");
  const setLanguage = (language) => {
    state.language = language === "ar" ? "ar" : "en";
    document.documentElement.lang = state.language;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset.i18n;
      if (key) element.textContent = t(key);
    });
    if (state.selectedUser) renderUserDetails(state.selectedUser);
    if (!document.querySelector('[data-panel="overview"]').hidden) loadOverview();
    if (!document.querySelector('[data-panel="users"]').hidden) loadUsers(state.userPage);
    if (!document.querySelector('[data-panel="activity"]').hidden) loadActivity(state.activityPage);
  };
  if (languageSelect instanceof HTMLSelectElement) {
    languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
  }

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    try {
      const csrf = await apiRequest("/api/auth/csrf");
      if (typeof csrf.csrf_token !== "string") throw new Error(t("csrfMissing"));
      await apiRequest("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf.csrf_token },
        body: JSON.stringify({}),
      });
      window.location.assign("/account.html?auth=signed-out");
    } catch (error) {
      toast(error instanceof Error ? error.message : t("failed"), true);
    }
  });

  setLanguage("en");
  loadOverview();
})();
