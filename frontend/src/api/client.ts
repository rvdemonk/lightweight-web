const BASE = '/api/v1';

// Clock offset: server time minus client time (ms). Positive = client is behind server.
let serverClockOffset = 0;
export function getServerClockOffset() { return serverClockOffset; }

function getToken(): string | null {
  return localStorage.getItem('lw_token');
}

export function setToken(token: string) {
  localStorage.setItem('lw_token', token);
}

export function clearToken() {
  localStorage.removeItem('lw_token');
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  // Calibrate clock offset from server Date header
  const serverDate = resp.headers.get('Date');
  if (serverDate) {
    const serverTime = new Date(serverDate).getTime();
    if (!isNaN(serverTime)) {
      serverClockOffset = serverTime - Date.now();
    }
  }

  if (resp.status === 401) {
    // Don't auto-redirect for auth endpoints — let the caller handle the error
    const isAuthEndpoint = path.startsWith('/auth/');
    if (!isAuthEndpoint) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const err = new Error('Unauthorized');
    (err as any).status = 401;
    throw err;
  }

  if (resp.status === 204) {
    return undefined as T;
  }

  if (!resp.ok) {
    const err = new Error(`HTTP ${resp.status}`);
    (err as any).status = resp.status;
    throw err;
  }

  return resp.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (username: string, password: string, invite_code?: string) =>
    request<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, invite_code }),
    }),
  checkAuth: () => request<void>('/auth/check'),

  // Exercises
  listExercises: () => request<import('./types').Exercise[]>('/exercises'),
  createExercise: (data: { name: string; muscle_group?: string; equipment?: string; notes?: string }) =>
    request<import('./types').Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateExercise: (id: number, data: Record<string, unknown>) =>
    request<import('./types').Exercise>(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteExercise: (id: number) =>
    request<void>(`/exercises/${id}`, { method: 'DELETE' }),

  // Templates
  listTemplates: () => request<import('./types').Template[]>('/templates'),
  getTemplate: (id: number) => request<import('./types').Template>(`/templates/${id}`),
  createTemplate: (data: Record<string, unknown>) =>
    request<import('./types').Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTemplate: (id: number, data: Record<string, unknown>) =>
    request<import('./types').Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTemplate: (id: number) =>
    request<void>(`/templates/${id}`, { method: 'DELETE' }),

  // Sessions
  listSessions: (params?: { limit?: number; offset?: number; template_id?: number; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.template_id) query.set('template_id', String(params.template_id));
    if (params?.date) query.set('date', params.date);
    const qs = query.toString();
    return request<import('./types').SessionSummary[]>(`/sessions${qs ? '?' + qs : ''}`);
  },
  getActiveSession: () => request<import('./types').Session | null>('/sessions/active'),
  getSession: (id: number) => request<import('./types').Session>(`/sessions/${id}`),
  createSession: (data: { template_id?: number; name?: string }) =>
    request<import('./types').Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSession: (id: number, data: Record<string, unknown>) =>
    request<import('./types').Session>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSession: (id: number) =>
    request<void>(`/sessions/${id}`, { method: 'DELETE' }),

  // Session exercises
  addSessionExercise: (sessionId: number, data: { exercise_id: number; position?: number }) =>
    request<import('./types').SessionExercise>(`/sessions/${sessionId}/exercises`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSessionExercise: (sessionId: number, seId: number, data: Record<string, unknown>) =>
    request<void>(`/sessions/${sessionId}/exercises/${seId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  removeSessionExercise: (sessionId: number, seId: number) =>
    request<void>(`/sessions/${sessionId}/exercises/${seId}`, { method: 'DELETE' }),

  // Sets
  addSet: (sessionId: number, seId: number, data: { weight_kg?: number | null; reps: number; set_type?: string; rir?: number | null }) =>
    request<import('./types').WorkoutSet>(`/sessions/${sessionId}/exercises/${seId}/sets`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSet: (setId: number, data: Record<string, unknown>) =>
    request<import('./types').WorkoutSet>(`/sets/${setId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSet: (setId: number) =>
    request<void>(`/sets/${setId}`, { method: 'DELETE' }),

  // Analytics
  activityHeatmap: () => request<import('./types').DayActivity[]>('/analytics/heatmap'),
  activityHeatmapTemplates: () => request<import('./types').DayTemplateActivity[]>('/analytics/heatmap-templates'),
  analyticsExercises: () => request<import('./types').ExerciseSummary[]>('/analytics/exercises'),
  e1rmProgression: (exerciseId: number) => request<import('./types').ExerciseE1rm>(`/analytics/e1rm/${exerciseId}`),
  weeklyVolume: () => request<import('./types').WeeklyVolume[]>('/analytics/volume'),
  sessionFrequency: () => request<import('./types').WeeklyFrequency[]>('/analytics/frequency'),
  e1rmSpider: (exerciseIds: number[], weeks: number) =>
    request<import('./types').E1rmSpiderPoint[]>(`/analytics/e1rm-spider?exercise_ids=${exerciseIds.join(',')}&weeks=${weeks}`),
  e1rmMovers: (days?: number) =>
    request<import('./types').E1rmMover[]>(`/analytics/e1rm-movers${days ? `?days=${days}` : ''}`),
  staleExercises: (days?: number) =>
    request<import('./types').StaleExercise[]>(`/analytics/stale-exercises${days ? `?days=${days}` : ''}`),
  sessionPRs: (sessionId: number) =>
    request<import('./types').ExercisePRData[]>(`/analytics/session-prs/${sessionId}`),
  getE1rmSpiderPrefs: () => request<import('./types').E1rmSpiderPrefs>('/preferences/e1rm-spider'),
  setE1rmSpiderPrefs: (prefs: import('./types').E1rmSpiderPrefs) =>
    request<void>('/preferences/e1rm-spider', { method: 'PUT', body: JSON.stringify(prefs) }),

  // Preferences (generic)
  getPreference: (key: string) =>
    request<{ key: string; value: string }>(`/preferences/${key}`).then(r => r.value).catch(e => {
      if (e.status === 404) return null;
      throw e;
    }) as Promise<string | null>,
  setPreference: (key: string, value: string) =>
    request<void>(`/preferences/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),

  // Export
  exportMeta: () => request<import('./types').ExportMeta>('/export/meta'),
  exportSessions: async () => {
    const resp = await fetch(`${BASE}/export/sessions`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    if (resp.status === 429) throw Object.assign(new Error('Rate limited'), { status: 429 });
    if (resp.status === 401) {
      clearToken();
      if (window.location.pathname !== '/login') window.location.href = '/login';
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error('[export] unexpected response:', resp.status, text.slice(0, 200));
      throw new Error(`HTTP ${resp.status}`);
    }
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('csv')) {
      const text = await resp.text();
      console.error('[export] expected CSV but got:', contentType, text.slice(0, 200));
      throw new Error('Unexpected response type');
    }
    return resp.blob();
  },

  // History
  exerciseHistory: (exerciseId: number) =>
    request<import('./types').ExerciseHistory>(`/exercises/${exerciseId}/history`),
  templatePrevious: (templateId: number) =>
    request<import('./types').Session | null>(`/templates/${templateId}/previous`),
};
