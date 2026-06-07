* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --dark: #0A0A44;
  --blue: #1B52DD;
  --light-blue: #49A7D6;
  --white: #ffffff;
  --gray: #f0f4f8;
  --gray2: #e2e8f0;
  --text: #1a202c;
  --text2: #4a5568;
  --success: #38a169;
  --danger: #e53e3e;
}

body {
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--gray);
  color: var(--text);
  min-height: 100vh;
}

.app-container {
  max-width: 480px;
  margin: 0 auto;
  background: var(--gray);
  min-height: 100vh;
  position: relative;
}

/* TOP BAR */
.top-bar {
  background: linear-gradient(135deg, #0A0A44, #1B52DD);
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}
.top-logo {
  width: 36px; height: 36px;
  background: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 900; color: #0A0A44; font-size: 0.85rem;
}
.top-title { color: white; font-weight: 700; font-size: 1rem; }
.top-user { color: rgba(255,255,255,0.8); font-size: 0.75rem; }
.top-logout {
  background: rgba(255,255,255,0.15);
  border: none; color: white;
  padding: 6px 12px; border-radius: 8px;
  cursor: pointer; font-size: 0.8rem;
}

/* PAGE CONTENT */
.page-content {
  padding: 1rem;
  padding-bottom: 90px;
}

/* BOTTOM NAV */
.bottom-nav {
  position: fixed; bottom: 0;
  left: 50%; transform: translateX(-50%);
  width: 100%; max-width: 480px;
  background: white;
  border-top: 1px solid var(--gray2);
  display: flex;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
}
.nav-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; padding: 0.6rem 0.3rem;
  cursor: pointer; border: none; background: none;
  color: #a0aec0; transition: color 0.2s;
  font-family: inherit;
}
.nav-item.active { color: var(--blue); }
.nav-item svg { width: 22px; height: 22px; margin-bottom: 2px; }
.nav-item span { font-size: 0.65rem; font-weight: 500; }

/* CARDS */
.card {
  background: white; border-radius: 14px;
  padding: 1.25rem; margin-bottom: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.card-title {
  font-size: 1rem; font-weight: 700;
  color: var(--dark); margin-bottom: 0.75rem;
}

/* HERO BUTTON */
.hero-btn {
  background: linear-gradient(135deg, #1B52DD, #49A7D6);
  color: white; border: none; border-radius: 16px;
  padding: 1.5rem; width: 100%; text-align: left;
  cursor: pointer; margin-bottom: 0.75rem;
  display: flex; align-items: center; gap: 1rem;
  box-shadow: 0 4px 15px rgba(27,82,221,0.3);
  font-family: inherit; transition: all 0.2s;
}
.hero-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(27,82,221,0.4);
}
.hero-btn svg { width: 40px; height: 40px; flex-shrink: 0; }
.hero-btn h3 { font-size: 1.1rem; font-weight: 700; }
.hero-btn p { font-size: 0.8rem; opacity: 0.85; margin-top: 2px; }

/* STATS */
.stats-row {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.75rem; margin-bottom: 0.75rem;
}
.stat-card {
  background: white; border-radius: 12px;
  padding: 1rem; text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.stat-num { font-size: 1.6rem; font-weight: 800; color: var(--dark); }
.stat-num.plus { color: var(--success); }
.stat-num.minus { color: var(--danger); }
.stat-label { font-size: 0.72rem; color: #718096; margin-top: 2px; }

/* FORM */
.form-group { margin-bottom: 1rem; }
.form-group label {
  display: block; font-size: 0.8rem; font-weight: 600;
  color: var(--text2); margin-bottom: 4px;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%; padding: 0.75rem 1rem;
  border: 1.5px solid var(--gray2);
  border-radius: 10px; font-size: 0.95rem;
  color: var(--text); background: white;
  transition: border-color 0.2s; font-family: inherit;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none; border-color: var(--blue);
  box-shadow: 0 0 0 3px rgba(27,82,221,0.1);
}
.form-group textarea { resize: vertical; min-height: 80px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

/* BUTTONS */
.btn {
  width: 100%; padding: 0.85rem;
  border: none; border-radius: 10px;
  font-size: 1rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  font-family: inherit; margin-bottom: 0.5rem;
}
.btn-primary {
  background: linear-gradient(135deg, #1B52DD, #0A0A44);
  color: white;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(27,82,221,0.4); }
.btn-secondary { background: var(--gray2); color: var(--text); }
.btn-danger { background: var(--danger); color: white; }
.btn-success { background: var(--success); color: white; }
.btn-sm {
  width: auto; padding: 0.4rem 0.9rem;
  font-size: 0.82rem; border-radius: 8px; display: inline-block;
}
.btn-outline {
  background: transparent; border: 1.5px solid var(--blue);
  color: var(--blue); padding: 0.5rem 1rem; font-size: 0.85rem;
}
.btn-outline:hover { background: var(--blue); color: white; }

/* BADGES */
.badge {
  display: inline-block; padding: 3px 10px;
  border-radius: 20px; font-size: 0.72rem; font-weight: 600;
}
.badge-active { background: #c6f6d5; color: #276749; }
.badge-done { background: var(--gray2); color: var(--text2); }

/* LIST ITEMS */
.list-item {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0; border-bottom: 1px solid var(--gray2);
}
.list-item:last-child { border-bottom: none; }
.list-item-left { display: flex; flex-direction: column; }
.list-item-title { font-weight: 600; color: var(--text); font-size: 0.9rem; }
.list-item-sub { font-size: 0.75rem; color: #718096; margin-top: 2px; }

/* SECTION HEADER */
.section-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 0.75rem;
}
.section-title {
  font-size: 0.8rem; font-weight: 700;
  color: var(--text2); text-transform: uppercase; letter-spacing: 0.5px;
}

/* PROGRESS BAR */
.progress-bar {
  height: 8px; background: var(--gray2);
  border-radius: 4px; overflow: hidden; margin-top: 6px;
}
.progress-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--blue), var(--light-blue));
}

/* MODAL */
.modal-overlay {
  display: none; position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); z-index: 200;
  align-items: flex-end; justify-content: center;
}
.modal-overlay.open { display: flex; }
.modal-sheet {
  background: white; border-radius: 20px 20px 0 0;
  padding: 1.5rem; width: 100%; max-width: 480px;
  max-height: 90vh; overflow-y: auto;
}
.modal-handle {
  width: 40px; height: 4px; background: var(--gray2);
  border-radius: 2px; margin: 0 auto 1.25rem;
}
.modal-title {
  font-size: 1.1rem; font-weight: 700;
  color: var(--dark); margin-bottom: 1.25rem;
}

/* ALERT */
.alert {
  padding: 0.75rem 1rem; border-radius: 10px;
  font-size: 0.85rem; margin-bottom: 1rem;
}
.alert-success { background: #c6f6d5; color: #276749; }
.alert-error { background: #fed7d7; color: #9b2c2c; }

/* TABS */
.tab-row {
  display: flex; gap: 0.5rem; margin-bottom: 1rem;
  overflow-x: auto; padding-bottom: 2px;
}
.tab-btn {
  padding: 0.4rem 0.9rem; border-radius: 20px;
  border: none; cursor: pointer;
  font-size: 0.82rem; font-weight: 600;
  white-space: nowrap; font-family: inherit;
  background: var(--gray2); color: var(--text2);
}
.tab-btn.active { background: var(--blue); color: white; }

/* EMPLOYEE AVATAR */
.employee-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #1B52DD, #49A7D6);
  display: flex; align-items: center; justify-content: center;
  color: white; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;
}

/* LOGIN PAGE */
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #0A0A44 0%, #1B52DD 60%, #49A7D6 100%);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 2rem 1rem;
}
.login-card {
  background: white; border-radius: 16px; padding: 2rem;
  width: 100%; max-width: 360px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.logo-circle {
  width: 80px; height: 80px; background: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 1rem; font-size: 2rem; font-weight: 900; color: #0A0A44;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

/* LOADING */
.loading {
  display: flex; align-items: center; justify-content: center;
  padding: 2rem; color: var(--text2); font-size: 0.9rem;
}

/* UTILS */
.text-blue { color: var(--blue); }
.text-green { color: var(--success); }
.text-red { color: var(--danger); }
.font-bold { font-weight: 700; }
.text-sm { font-size: 0.85rem; }
.text-xs { font-size: 0.75rem; }
.text-muted { color: #718096; }
.mt-1 { margin-top: 0.5rem; }
.mb-1 { margin-bottom: 0.5rem; }
