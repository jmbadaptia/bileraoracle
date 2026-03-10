import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ---- Dashboard ----
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<any>("/dashboard/stats"),
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<any>("/admin/stats"),
  });
}

// ---- Members ----
export function useMembers(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["members", params],
    queryFn: () => api.get<any>(`/members${search ? `?${search}` : ""}`),
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: ["members", id],
    queryFn: () => api.get<any>(`/members/${id}`),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/members", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useUpdateMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/members/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

// ---- Activities ----
export function useActivities(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["activities", params],
    queryFn: () => api.get<any>(`/activities${search ? `?${search}` : ""}`),
  });
}

export function useActivity(id: string) {
  return useQuery({
    queryKey: ["activities", id],
    queryFn: () => api.get<any>(`/activities/${id}`),
    enabled: !!id,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/activities", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useUpdateActivity(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/activities/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleteDocuments }: { id: string; deleteDocuments?: boolean }) =>
      api.delete(`/activities/${id}${deleteDocuments ? "?deleteDocuments=true" : ""}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useUpdateActivityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/activities/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useActivitiesForCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["activities", "calendar", from, to],
    queryFn: () => api.get<any>(`/activities?from=${from}&to=${to}&limit=500`),
    enabled: !!from && !!to,
  });
}

export function useAttendActivity(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/activities/${activityId}/attend`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useUnattendActivity(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/activities/${activityId}/attend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// ---- Activity Documents ----
export function useAttachDocument(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      api.post(`/activities/${activityId}/documents`, { documentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
    },
  });
}

export function useDetachDocument(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      api.delete(`/activities/${activityId}/documents/${documentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
    },
  });
}

// ---- Albums ----
export function useAlbums(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["albums", params],
    queryFn: () => api.get<any>(`/albums${search ? `?${search}` : ""}`),
  });
}

export function useAlbum(id: string) {
  return useQuery({
    queryKey: ["albums", id],
    queryFn: () => api.get<any>(`/albums/${id}`),
    enabled: !!id,
  });
}

export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      api.post("/albums", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useUpdateAlbum(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/albums/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums"] });
      qc.invalidateQueries({ queryKey: ["albums", id] });
    },
  });
}

export function useDeleteAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/albums/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useDeleteAlbums() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (albumIds: string[]) =>
      api.delete("/albums/batch", { albumIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export function useUploadPhotos(albumId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.upload(`/albums/${albumId}/photos`, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums", albumId] });
      qc.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

export function useDeletePhoto(albumId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`/albums/${albumId}/photos/${photoId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums", albumId] });
      qc.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

export function useDeletePhotos(albumId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photoIds: string[]) =>
      api.delete(`/albums/${albumId}/photos/batch`, { photoIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["albums", albumId] });
      qc.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}

// ---- Activity Albums ----
export function useAttachAlbum(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) =>
      api.post(`/activities/${activityId}/albums`, { albumId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
    },
  });
}

export function useDetachAlbum(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (albumId: string) =>
      api.delete(`/activities/${activityId}/albums/${albumId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
    },
  });
}

// ---- Documents ----
export function useDocuments(params?: Record<string, string>) {
  const merged = { limit: "200", ...params };
  const search = new URLSearchParams(merged).toString();
  return useQuery({
    queryKey: ["documents", params],
    queryFn: () => api.get<any>(`/documents?${search}`),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.get<any>(`/documents/${id}`),
    enabled: !!id,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => api.upload("/documents", formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useProcessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      api.post("/documents/process", { documentId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useSummarizeDocument() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.upload<{ summary: string }>("/documents/summarize", formData),
  });
}

// ---- Users ----
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/users"),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => api.get<any>(`/users/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/users", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (userId: string) =>
      api.post("/auth/resend-verification", { userId }),
  });
}

// ---- Tags ----
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<any>("/tags"),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post("/tags", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tags"] }),
  });
}

// ---- Search ----
export function useSearch() {
  return useMutation({
    mutationFn: (data: {
      query: string;
      limit?: number;
      sessionType?: string;
    }) => api.post<any>("/search", data),
  });
}

export function useFulltextSearch(query: string, sessionType?: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sessionType && sessionType !== "ALL") params.set("sessionType", sessionType);
  return useQuery({
    queryKey: ["fulltext-search", query, sessionType],
    queryFn: () => api.get<any>(`/search/fulltext?${params.toString()}`),
    enabled: query.length >= 2,
  });
}

// ---- Ordinances ----
export function useOrdinances(params?: Record<string, string>) {
  const merged = { ...params, sessionType: "ORDINANCE", limit: "200" };
  const search = new URLSearchParams(merged).toString();
  return useQuery({
    queryKey: ["ordinances", params],
    queryFn: () => api.get<any>(`/documents?${search}`),
  });
}

export function useScrapeOrdinances() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/documents/scrape-ordinances", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordinances"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---- Conversations ----
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<any>("/conversations"),
  });
}

export function useConversation(id: string | undefined) {
  return useQuery({
    queryKey: ["conversations", id],
    queryFn: () => api.get<any>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<any>("/conversations", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}

export function useRenameConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      api.patch(`/conversations/${id}`, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });
}
