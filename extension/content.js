const state = {
  auth: null,
  room: null,
  ws: null,
  video: null,
  role: "viewer",
  pushRef: 1,
  connected: false,
  suppressEventsUntil: 0,
  seekDebounce: null,
  pingTimer: null,
  roleTimer: null,
  statusEl: null,
  heartbeatTimer: null
};

const EVENT = {
  PLAY: "PLAY",
  PAUSE: "PAUSE",
  SEEK: "SEEK",
  SET_SOURCE: "SET_SOURCE",
  PING: "PING"
};

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function createOverlay() {
  if (state.statusEl) return;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.top = "14px";
  el.style.right = "14px";
  el.style.zIndex = "2147483647";
  el.style.background = "rgba(15,23,42,0.88)";
  el.style.color = "#fff";
  el.style.font = "12px/1.2 ui-sans-serif,system-ui,sans-serif";
  el.style.padding = "8px 10px";
  el.style.borderRadius = "10px";
  el.textContent = "WatchParrty";
  document.body.appendChild(el);
  state.statusEl = el;
}

function setOverlayText() {
  if (!state.statusEl) return;
  const roomId = state.room?.roomId || "-";
  const conn = state.connected ? "Connected" : "Disconnected";
  state.statusEl.textContent = `WatchParrty ${conn} | Room ${roomId} | ${state.role}`;
}

function getVideo() {
  return document.querySelector("video");
}

function shouldCorrectDrift(hostTime, localTime, threshold = 0.75) {
  return Math.abs(hostTime - localTime) > threshold;
}

function sendSocketMessage(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
  state.ws.send(JSON.stringify(payload));
}

function pushBroadcast(syncPayload) {
  if (!state.room || !state.auth) return;
  sendSocketMessage({
    topic: `room-${state.room.roomId}`,
    event: "broadcast",
    payload: { event: "sync", payload: syncPayload },
    ref: String(state.pushRef++)
  });
}

async function fetchRole() {
  if (!state.auth || !state.room) return "viewer";

  const user = decodeJwt(state.auth.accessToken);
  const userId = user?.sub;
  if (!userId) return "viewer";

  try {
    const res = await fetch(
      `${state.auth.supabaseUrl}/rest/v1/room_members?room_id=eq.${state.room.roomId}&user_id=eq.${userId}&select=role&limit=1`,
      {
        headers: {
          apikey: state.auth.anonKey,
          Authorization: `Bearer ${state.auth.accessToken}`
        }
      }
    );
    const json = await res.json();
    state.role = json?.[0]?.role || "viewer";
  } catch {
    state.role = "viewer";
  }

  setOverlayText();
  return state.role;
}

function buildSyncEvent(type) {
  const user = decodeJwt(state.auth.accessToken);
  return {
    type,
    senderId: user?.sub || "unknown",
    payload: {
      roomId: state.room.roomId,
      platform: "netflix",
      videoTime: Number(state.video?.currentTime || 0),
      ts: Date.now(),
      sourceUrl: state.room.sourceUrl
    }
  };
}

function applyIncomingEvent(syncEvent) {
  if (!state.video || !syncEvent?.payload) return;

  const hostTime = Number(syncEvent.payload.videoTime || 0);
  const localTime = Number(state.video.currentTime || 0);

  state.suppressEventsUntil = Date.now() + 350;

  if (syncEvent.type === EVENT.PLAY) {
    if (shouldCorrectDrift(hostTime, localTime)) state.video.currentTime = hostTime;
    void state.video.play();
  }

  if (syncEvent.type === EVENT.PAUSE) {
    if (shouldCorrectDrift(hostTime, localTime)) state.video.currentTime = hostTime;
    state.video.pause();
  }

  if (syncEvent.type === EVENT.SEEK || syncEvent.type === EVENT.PING) {
    if (shouldCorrectDrift(hostTime, localTime)) state.video.currentTime = hostTime;
  }
}

function setupVideoListeners() {
  if (!state.video) return;
  const guard = () => state.role !== "host" || Date.now() < state.suppressEventsUntil;

  state.video.addEventListener("play", () => {
    if (guard()) return;
    pushBroadcast(buildSyncEvent(EVENT.PLAY));
  });

  state.video.addEventListener("pause", () => {
    if (guard()) return;
    pushBroadcast(buildSyncEvent(EVENT.PAUSE));
  });

  state.video.addEventListener("seeking", () => {
    if (guard()) return;
    if (state.seekDebounce) clearTimeout(state.seekDebounce);
    state.seekDebounce = setTimeout(() => {
      pushBroadcast(buildSyncEvent(EVENT.SEEK));
    }, 250);
  });
}

function setupPingLoop() {
  if (state.pingTimer) clearInterval(state.pingTimer);
  state.pingTimer = setInterval(() => {
    if (state.role !== "host") return;
    pushBroadcast(buildSyncEvent(EVENT.PING));
  }, 3000);
}

function setupRoleLoop() {
  if (state.roleTimer) clearInterval(state.roleTimer);
  state.roleTimer = setInterval(() => {
    void fetchRole();
  }, 5000);
}

function connectRealtime() {
  if (!state.auth || !state.room) return;

  const wsUrl = `${state.auth.supabaseUrl.replace("https://", "wss://")}/realtime/v1/websocket?apikey=${encodeURIComponent(
    state.auth.anonKey
  )}&vsn=1.0.0&access_token=${encodeURIComponent(state.auth.accessToken)}`;

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    sendSocketMessage({
      topic: `room-${state.room.roomId}`,
      event: "phx_join",
      payload: { config: { broadcast: { ack: false, self: false } } },
      ref: String(state.pushRef++)
    });

    if (state.heartbeatTimer) clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = setInterval(() => {
      sendSocketMessage({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(state.pushRef++) });
    }, 30000);

    state.connected = true;
    setOverlayText();
  };

  state.ws.onclose = () => {
    state.connected = false;
    setOverlayText();
  };

  state.ws.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data);
      if (parsed.event === "broadcast" && parsed.payload?.event === "sync") {
        applyIncomingEvent(parsed.payload.payload);
      }
    } catch {
      // ignore
    }
  };
}

function getStoredState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "WATCHPARRTY_GET_STATE" }, (result) => resolve(result || {}));
  });
}

async function bootstrap() {
  createOverlay();
  const stored = await getStoredState();
  state.auth = stored.watchparrty_auth || null;
  state.room = stored.watchparrty_active_room || null;

  if (!state.auth || !state.room || state.room.platform !== "netflix") {
    setOverlayText();
    return;
  }

  const video = getVideo();
  if (!video) {
    setTimeout(bootstrap, 1200);
    return;
  }

  state.video = video;
  await fetchRole();
  connectRealtime();
  setupVideoListeners();
  setupPingLoop();
  setupRoleLoop();
  setOverlayText();
}

const observer = new MutationObserver(() => {
  if (!state.video) {
    state.video = getVideo();
    if (state.video) setupVideoListeners();
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });
void bootstrap();
