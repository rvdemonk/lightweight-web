const BASE = '/api/v1';

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

  if (resp.status === 401) {
    clearToken();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (resp.status === 204) {
    return undefined as T;
  }

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  return resp.json();
}

export const api = {
  // Auth
  setup: (password: string) =>
    request<{ token: string }>('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  login: (password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
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
  listSessions: (params?: { limit?: number; offset?: number; template_id?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.template_id) query.set('template_id', String(params.template_id));
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
  addSet: (sessionId: number, seId: number, data: { weight_kg?: number | null; reps: number; set_type?: string }) =>
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

  // History
  exerciseHistory: (exerciseId: number) =>
    request<import('./types').ExerciseHistory>(`/exercises/${exerciseId}/history`),
  templatePrevious: (templateId: number) =>
    request<import('./types').Session | null>(`/templates/${templateId}/previous`),
};
