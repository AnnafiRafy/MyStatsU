(function () {
  const loginPage = "index.html";
  const script = document.currentScript;
  const requiresAuth = script && script.hasAttribute("data-require-auth");

  function readSession() {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) return null;

    try {
      const user = JSON.parse(rawUser);
      if (!user || typeof user !== "object") return null;
      return { token, user };
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  function redirectToLogin() {
    if (!location.pathname.endsWith("/" + loginPage) && !location.pathname.endsWith("/")) {
      location.replace(loginPage);
    }
  }

  function requireAuth() {
    const session = readSession();
    if (!session) {
      clearSession();
      redirectToLogin();
      throw new Error("Login required");
    }

    return session;
  }

  function authHeaders(headers = {}) {
    const session = requireAuth();
    return {
      ...headers,
      Authorization: "Bearer " + session.token
    };
  }

  function currentUserId() {
    const { user } = requireAuth();
    return user.mahasiswaID || user.id || user.adminID;
  }

  function applyUser(user) {
    const name = user.nama || "Mahasiswa";
    const firstName = name.trim().split(/\s+/)[0] || name;
    const nim = user.nim || user.email || "-";
    const initial = (name.trim()[0] || "M").toUpperCase();

    document.querySelectorAll(".sb-user-name, [data-user-name]").forEach((el) => {
      el.textContent = name;
    });

    document.querySelectorAll(".sb-user-nim, [data-user-nim]").forEach((el) => {
      el.textContent = nim;
    });

    document.querySelectorAll(".sb-avatar, [data-user-initial]").forEach((el) => {
      el.textContent = initial;
    });

    document.querySelectorAll("[data-user-first-name]").forEach((el) => {
      el.textContent = firstName;
    });
  }

  function logout() {
    clearSession();
    location.href = loginPage;
  }

  if (requiresAuth) {
    document.documentElement.setAttribute("data-auth-required", "true");

    const style = document.createElement("style");
    style.textContent = 'html[data-auth-required="true"]:not([data-auth-ready="true"]) body{visibility:hidden;}';
    document.head.appendChild(style);

    if (!readSession()) {
      clearSession();
      redirectToLogin();
      return;
    }

    document.documentElement.setAttribute("data-auth-ready", "true");
  }

  window.MyStatsUAuth = {
    applyUser,
    authHeaders,
    clearSession,
    currentUserId,
    logout,
    readSession,
    requireAuth
  };

  function init() {
    if (!requiresAuth) return;

    const { user } = requireAuth();
    applyUser(user);

    document.querySelectorAll("[data-logout], a[href='index.html']").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
