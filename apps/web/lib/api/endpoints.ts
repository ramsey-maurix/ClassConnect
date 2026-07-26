import { apiRequest } from "./client";

export const attendanceApi = {
  activeSessions: () => apiRequest<unknown[]>("/attendance/sessions/active"),
  mark: ({ sessionId, ...body }: { sessionId: string; pin?: string; qrToken?: string; latitude: number; longitude: number; accuracy: number }) =>
    apiRequest<unknown>(`/attendance/sessions/${sessionId}/mark`, { method: "POST", body: JSON.stringify(body) }),
  createSession: (body: unknown) =>
    apiRequest<unknown>("/attendance/sessions", { method: "POST", body: JSON.stringify(body) }),
  closeSession: (sessionId: string) =>
    apiRequest<unknown>(`/attendance/sessions/${sessionId}/close`, { method: "POST" }),
};

export const gradesApi = {
  myGrades: () => apiRequest<unknown[]>("/students/me/grades"),
  courseGradebook: (courseId: string) => apiRequest<unknown[]>(`/courses/${courseId}/grades`),
  saveDraft: (assessmentId: string, body: unknown) =>
    apiRequest<unknown>(`/assessments/${assessmentId}/grades/draft`, { method: "POST", body: JSON.stringify(body) }),
  publish: (assessmentId: string) =>
    apiRequest<unknown>(`/assessments/${assessmentId}/grades/publish`, { method: "POST" }),
};

export const adminApi = {
  dashboard: () => apiRequest<unknown>("/analytics/admin"),
  users: (query = "") => apiRequest<unknown[]>(`/users${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  reports: (body: unknown) => apiRequest<Blob>("/reports", { method: "POST", body: JSON.stringify(body) }),
};
