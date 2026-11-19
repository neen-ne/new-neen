<?php
declare(strict_types=1);

require_once __DIR__ . '/api/src/Database.php';
require_once __DIR__ . '/api/src/AdminPage.php';

header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");

try {
    $owner = AdminPage::authorize(Database::connect(), true);
} catch (AdminPageAccessException $exception) {
    if ($exception->httpStatus === 401) {
        header('Location: /account.html?auth=required', true, 302);
        exit;
    }

    http_response_code($exception->httpStatus);
    header('Content-Type: text/html; charset=utf-8');
    $message = $exception->httpStatus === 403
        ? 'This control room is restricted to the separately provisioned site owner.'
        : 'Secure HTTPS access is required.';
    ?>
    <!doctype html>
    <html lang="en">
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Access denied — NEEN</title></head>
      <body><main><h1>Access denied</h1><p><?= htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') ?></p><a href="/events.html">Return to NEEN</a></main></body>
    </html>
    <?php
    exit;
} catch (Throwable $exception) {
    error_log('NEEN owner dashboard unavailable: ' . get_class($exception));
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    ?>
    <!doctype html>
    <html lang="en">
      <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Service unavailable — NEEN</title></head>
      <body><main><h1>Owner dashboard is unavailable</h1><p>The secure administration service could not be reached.</p><a href="/events.html">Return to NEEN</a></main></body>
    </html>
    <?php
    exit;
}

$escape = static fn (string $value): string => htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!doctype html>
<html lang="en" dir="ltr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#FFF2F7" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Owner Dashboard — NEEN</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&family=Noto+Sans+Arabic:wght@400;500;600;700&family=Oxanium:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
    <link rel="stylesheet" href="events-admin.css" />
    <link rel="stylesheet" href="owner-dashboard.css" />
    <script src="owner-dashboard.js" defer></script>
  </head>
  <body class="admin-body owner-body">
    <div class="admin-shell owner-shell" id="owner-app" data-current-user="<?= (int) $owner['user_id'] ?>">
      <aside class="admin-sidebar owner-sidebar" aria-label="Owner navigation">
        <a class="admin-brand" href="index.html" aria-label="NEEN Home">
          <span class="admin-brand-wordmark">NEEN<span>.</span></span>
          <span class="admin-brand-label">OWNER CONTROL ROOM</span>
        </a>
        <nav class="admin-nav" aria-label="Dashboard sections">
          <button type="button" class="admin-nav-item is-active" data-section="overview" aria-current="page"><span class="admin-nav-index">01</span><span data-i18n="overview">Overview</span></button>
          <button type="button" class="admin-nav-item" data-section="users"><span class="admin-nav-index">02</span><span data-i18n="users">Users</span></button>
          <button type="button" class="admin-nav-item" data-section="wallet"><span class="admin-nav-index">03</span><span data-i18n="wallet">Wallet &amp; Transactions</span></button>
          <button type="button" class="admin-nav-item" data-section="modules"><span class="admin-nav-index">04</span><span data-i18n="modules">Connected Modules</span></button>
          <button type="button" class="admin-nav-item" data-section="activity"><span class="admin-nav-index">05</span><span data-i18n="activity">Admin Activity</span></button>
        </nav>
        <div class="admin-sidebar-footer"><span class="admin-live-dot" aria-hidden="true"></span><span data-i18n="ownerVerified">OWNER ROLE SERVER-VERIFIED</span></div>
      </aside>

      <main class="admin-main">
        <header class="admin-topbar">
          <div class="admin-topbar-title"><p class="admin-eyebrow">NEEN / OWNER OPERATIONS</p><h1 data-i18n="ownerDashboard">Owner Dashboard</h1></div>
          <div class="owner-header-actions">
            <label class="owner-language-label" for="owner-language" data-i18n="language">Language</label>
            <select id="owner-language" data-owner-language aria-label="Dashboard language"><option value="en">English</option><option value="ar">العربية</option></select>
            <div class="admin-identity">
              <span class="admin-avatar" aria-hidden="true"><?= $escape(strtoupper(substr($owner['username'], 0, 1))) ?></span>
              <span class="admin-identity-copy"><strong><?= $escape($owner['username']) ?></strong><small>Owner</small></span>
              <button class="admin-logout" type="button" data-logout data-i18n="signOut">Sign out</button>
            </div>
          </div>
        </header>

        <div class="admin-content owner-content">
          <section class="admin-section is-active" data-panel="overview" aria-labelledby="overview-title">
            <div class="admin-section-heading"><div><p class="admin-eyebrow">LIVE DATABASE / 01</p><h2 id="overview-title" data-i18n="overview">Overview</h2></div><p data-i18n="overviewDesc">Current account, wallet, event, game, and order data from the connected database.</p></div>
            <div class="owner-stat-grid" data-owner-stats aria-live="polite"><p class="admin-state">Loading live statistics…</p></div>
            <div class="owner-chart-grid">
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">30 DAYS</p><h3 data-i18n="newAccounts">New accounts</h3></div></div><div class="owner-chart" data-chart="users"></div></article>
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">30 DAYS</p><h3 data-i18n="coinActivity">Coins activity</h3></div></div><div class="owner-chart" data-chart="wallet_transactions"></div></article>
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">30 DAYS</p><h3 data-i18n="rechargeOrders">Recharge orders</h3></div></div><div class="owner-chart" data-chart="diamond_orders"></div></article>
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">30 DAYS</p><h3 data-i18n="eventVotes">Event votes</h3></div></div><div class="owner-chart" data-chart="event_votes"></div></article>
            </div>
            <div class="owner-overview-grid">
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">LATEST</p><h3 data-i18n="recentUsers">Recent registrations</h3></div><button type="button" class="admin-text-button" data-open-section="users" data-i18n="viewUsers">View users ↗</button></div><div data-recent-users><p class="admin-state">Loading registrations…</p></div></article>
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">LATEST</p><h3 data-i18n="recentOrders">Recent diamond orders</h3></div><a class="admin-text-button" href="events-admin.php" data-i18n="openAdmin">Open admin modules ↗</a></div><div data-recent-orders><p class="admin-state">Loading orders…</p></div></article>
              <article class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">LATEST</p><h3 data-i18n="recentActivity">Recent admin activity</h3></div><button type="button" class="admin-text-button" data-open-section="activity" data-i18n="viewActivity">View activity ↗</button></div><div data-recent-activity><p class="admin-state">Loading audit records…</p></div></article>
            </div>
          </section>

          <section class="admin-section" data-panel="users" aria-labelledby="users-title" hidden>
            <div class="admin-section-heading"><div><p class="admin-eyebrow">ACCOUNT MANAGEMENT / 02</p><h2 id="users-title" data-i18n="users">Users</h2></div><p data-i18n="usersDesc">Search, inspect, edit profile details, manage non-owner roles, and suspend accounts. Owner accounts and your own roles are protected.</p></div>
            <div class="admin-panel">
              <form class="admin-order-search" data-owner-user-search>
                <label><span data-i18n="searchUsers">Search username, email, or ID</span><input name="q" maxlength="100" /></label>
                <label><span data-i18n="status">Status</span><select name="status"><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deleted">Deleted</option><option value="pending_verification">Pending verification</option></select></label>
                <label><span data-i18n="sort">Sort</span><select name="sort"><option value="newest">Newest</option><option value="username">Username</option><option value="last_login">Last active</option><option value="coins">Coins</option></select></label>
                <button class="admin-secondary-button" type="submit" data-i18n="search">Search</button>
                <button class="admin-secondary-button" type="button" data-owner-users-refresh data-i18n="refresh">Refresh</button>
              </form>
              <div data-owner-users aria-live="polite"><p class="admin-state">Loading user directory…</p></div>
              <div data-owner-pagination class="owner-pagination"></div>
            </div>
            <div class="admin-panel owner-user-detail" data-owner-user-detail aria-live="polite"><p class="admin-state" data-i18n="selectUser">Select a user to review account and wallet details.</p></div>
          </section>

          <section class="admin-section" data-panel="wallet" aria-labelledby="wallet-title" hidden>
            <div class="admin-section-heading"><div><p class="admin-eyebrow">IMMUTABLE COINS LEDGER / 03</p><h2 id="wallet-title" data-i18n="wallet">Wallet &amp; Transactions</h2></div><p data-i18n="walletDesc">Wallet changes use the existing transactional ledger, require a reason, prevent negative balances, and record an idempotency key.</p></div>
            <div class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">SELECTED ACCOUNT</p><h3 data-i18n="walletAccount">Wallet account</h3></div></div><div data-owner-wallet-account><p class="admin-state" data-i18n="selectWalletUser">Select an account from Users to view its ledger and make a documented adjustment.</p></div></div>
            <div class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">RECENT ENTRIES</p><h3 data-i18n="ledgerHistory">Ledger history</h3></div></div><div data-owner-ledger><p class="admin-state" data-i18n="selectWalletUser">Select an account from Users to view its ledger and make a documented adjustment.</p></div></div>
            <div class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">AUDITED OPERATION</p><h3 data-i18n="adjustCoins">Adjust Coins</h3></div></div>
              <form class="admin-form-grid owner-adjustment-form" data-owner-adjustment>
                <label><span data-i18n="direction">Direction</span><select name="direction" required><option value="credit">Add</option><option value="debit">Deduct</option></select></label>
                <label><span data-i18n="balanceType">Balance type</span><select name="balance_type" required><option value="earned">Earned</option><option value="purchased">Purchased</option></select></label>
                <label><span data-i18n="amount">Amount</span><input name="amount" type="number" min="1" max="100000000" step="1" required /></label>
                <label class="admin-form-wide"><span data-i18n="reason">Reason (required)</span><input name="reason" minlength="3" maxlength="1000" required /></label>
                <button class="admin-primary-button" type="submit" data-i18n="submitAdjustment">Submit adjustment</button>
              </form>
              <p class="owner-warning" data-i18n="adjustmentWarning">Every adjustment is permanent in the ledger. Verify the account, balance type, amount, and reason before submitting.</p>
            </div>
          </section>

          <section class="admin-section" data-panel="modules" aria-labelledby="modules-title" hidden>
            <div class="admin-section-heading"><div><p class="admin-eyebrow">EXISTING SERVICES / 04</p><h2 id="modules-title" data-i18n="modules">Connected Modules</h2></div><p data-i18n="modulesDesc">Open the existing permission-checked administration console for modules already backed by services and database records.</p></div>
            <article class="admin-panel">
              <div class="admin-panel-heading"><div><p class="admin-eyebrow">RUNTIME-BACKED SETTINGS</p><h3 data-i18n="gamesRewards">Games &amp; Rewards</h3></div></div>
              <p class="admin-module-description" data-i18n="gameSettingsNote">The daily free-attempt limit and verified-win Coins reward are connected to the game runtime. Board size, paid attempts, and other hard-coded rules are not editable here.</p>
              <div data-owner-games aria-live="polite"><p class="admin-state">Loading game settings…</p></div>
            </article>
            <article class="admin-panel">
              <div class="admin-panel-heading"><div><p class="admin-eyebrow">PUBLIC SITE CONFIGURATION</p><h3 data-i18n="siteSettings">Site Settings</h3></div></div>
              <form class="admin-form-grid owner-settings-form" data-owner-site-settings>
                <label class="admin-form-wide"><span data-i18n="tiktokProfile">TikTok profile URL</span><input name="tiktok_url" type="url" maxlength="80" required /></label>
                <label class="admin-form-wide"><span data-i18n="siteDescription">Site description</span><textarea name="site_description" maxlength="300" required></textarea></label>
                <button class="admin-primary-button" type="submit" data-i18n="saveSettings">Save site settings</button>
              </form>
              <p class="admin-state" data-owner-settings-updated></p>
            </article>
            <div class="owner-module-grid">
              <a class="owner-module-card" href="events-admin.php"><span>01</span><strong data-i18n="existingAdmin">Existing Admin Dashboard</strong><small data-i18n="existingAdminDesc">Games, rewards, attendance, community events, diamond packages and orders, Coins packages and orders.</small><b data-i18n="openConsole">Open console ↗</b></a>
              <article class="owner-module-card owner-module-unavailable"><span>02</span><strong data-i18n="contentManagement">Content Management</strong><small data-i18n="notConnected">Videos, gallery assets, and page copy remain static files. No CMS editing controls are exposed.</small><b data-i18n="requiresIntegration">Requires a media workflow and public-page integration</b></article>
              <article class="owner-module-card owner-module-unavailable"><span>03</span><strong data-i18n="charts">Extended reports</strong><small data-i18n="reportsScope">The Overview charts are real 30-day database series. Additional reporting dimensions are not yet implemented.</small><b data-i18n="notAvailable">Not available</b></article>
            </div>
          </section>

          <section class="admin-section" data-panel="activity" aria-labelledby="activity-title" hidden>
            <div class="admin-section-heading"><div><p class="admin-eyebrow">READ-ONLY AUDIT / 05</p><h2 id="activity-title" data-i18n="activity">Admin Activity</h2></div><p data-i18n="activityDesc">Central, read-only view of recorded administrative actions, actor, entity, available metadata, IP address, and timestamp.</p></div>
            <div class="admin-panel">
              <form class="admin-order-search" data-owner-activity-search><label><span data-i18n="searchActivity">Search actor or action</span><input name="q" maxlength="100" /></label><button class="admin-secondary-button" type="submit" data-i18n="search">Search</button><button class="admin-secondary-button" type="button" data-owner-activity-refresh data-i18n="refresh">Refresh</button></form>
              <div data-owner-activity aria-live="polite"><p class="admin-state">Loading audit records…</p></div>
              <div data-owner-activity-pagination class="owner-pagination"></div>
            </div>
          </section>
        </div>
      </main>
    </div>
    <div class="admin-toast" data-owner-toast role="status" aria-live="polite"></div>
  </body>
</html>
