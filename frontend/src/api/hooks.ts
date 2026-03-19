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

export function useUpdateTheme() {
  return useMutation({
    mutationFn: (theme: string) => api.put("/admin/theme", { theme }),
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

// ---- Activity Attendees (admin) ----
export function useAddAttendee(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/activities/${activityId}/attendees`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useRemoveAttendee(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/activities/${activityId}/attendees/${userId}`),
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
    refetchInterval: (query) => {
      const docs = query.state.data?.documents || query.state.data || [];
      const hasPending = Array.isArray(docs) && docs.some((d: any) => d.status === "PENDING" || d.status === "PROCESSING");
      return hasPending ? 3000 : false;
    },
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ["documents", id],
    queryFn: () => api.get<any>(`/documents/${id}`),
    enabled: !!id,
    // Auto-poll while document is being processed
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "PROCESSING" ? 3000 : false;
    },
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

export function useReprocessDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/reprocess`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["documents", id] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

// ---- Users (backed by /members) ----
export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<any>("/members"),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => api.get<any>(`/members/${id}`),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/members", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/members/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useResendInvite() {
  return useMutation({
    mutationFn: (id: string) => api.post(`/members/${id}/resend-invite`, {}),
  });
}

export function usePlanUsage() {
  return useQuery({
    queryKey: ["plan-usage"],
    queryFn: () => api.get<any>("/admin/plan-usage"),
  });
}

export function useAiUsage(month?: string) {
  return useQuery({
    queryKey: ["ai-usage", month],
    queryFn: () => api.get<any>(`/admin/ai-usage${month ? `?month=${month}` : ""}`),
  });
}

export function useCompleteSetup() {
  return useMutation({
    mutationFn: () => api.put("/admin/setup-complete", {}),
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
export function useFulltextSearch(query: string, type?: string, limit?: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  if (limit) params.set("limit", String(limit));
  return useQuery({
    queryKey: ["fulltext-search", query, type, limit],
    queryFn: () => api.get<any>(`/search?${params.toString()}`),
    enabled: query.length >= 2,
  });
}

// ---- Contacts ----
export function useContacts(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["contacts", params],
    queryFn: () => api.get<any>(`/contacts${search ? `?${search}` : ""}`),
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: () => api.get<any>(`/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/contacts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/contacts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts", id] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useAttachContact(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contactId: string; role?: string }) =>
      api.post(`/activities/${activityId}/contacts`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
    },
  });
}

export function useDetachContact(activityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) =>
      api.delete(`/activities/${activityId}/contacts/${contactId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", activityId] });
    },
  });
}

export function useContactCategories() {
  return useQuery({
    queryKey: ["contact-categories"],
    queryFn: () => api.get<string[]>("/contacts/categories"),
  });
}

// ---- Groups ----
export function useGroups(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["groups", params],
    queryFn: () => api.get<any>(`/groups${search ? `?${search}` : ""}`),
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ["groups", id],
    queryFn: () => api.get<any>(`/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post("/groups", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.put(`/groups/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["groups", id] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useAddGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.post(`/groups/${groupId}/members`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups", groupId] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

// ---- Spaces ----
export function useSpaces(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["spaces", params],
    queryFn: () => api.get<any>(`/spaces${search ? `?${search}` : ""}`),
  });
}

export function useSpace(id: string) {
  return useQuery({
    queryKey: ["spaces", id],
    queryFn: () => api.get<any>(`/spaces/${id}`),
    enabled: !!id,
  });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/spaces", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spaces"] }),
  });
}

export function useUpdateSpace(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/spaces/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spaces"] });
      qc.invalidateQueries({ queryKey: ["spaces", id] });
    },
  });
}

export function useDeleteSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/spaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["spaces"] }),
  });
}

// ---- Bookings ----
export function useBookings(params?: Record<string, string>) {
  const search = new URLSearchParams(params).toString();
  return useQuery({
    queryKey: ["bookings", params],
    queryFn: () => api.get<any>(`/bookings${search ? `?${search}` : ""}`),
  });
}

export function useBookingsForCalendar(from: string, to: string) {
  return useQuery({
    queryKey: ["bookings", "calendar", from, to],
    queryFn: () => api.get<any>(`/bookings?from=${from}&to=${to}&limit=500`),
    enabled: !!from && !!to,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/bookings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useUpdateBooking(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.put(`/bookings/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/bookings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["spaces"] });
    },
  });
}

// ---- AI ----
export function useAIChat() {
  return useMutation({
    mutationFn: (question: string) =>
      api.post<{ answer: string; sources: { type: string; id: string; title: string; distance: number }[] }>("/ai/chat", { question }),
  });
}

export function useAISummarize() {
  return useMutation({
    mutationFn: (activityId: string) =>
      api.post<{ summary: string }>("/ai/summarize", { activityId }),
  });
}

// ---- Conversations ----
export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.get<any[]>("/conversations"),
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

