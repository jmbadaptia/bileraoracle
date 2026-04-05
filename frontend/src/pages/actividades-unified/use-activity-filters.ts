import { useSearchParams } from "react-router";
import { useCallback } from "react";

export type ViewMode = "calendar" | "list" | "kanban";

export interface ActivityFilters {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  types: Set<string>;
  toggleType: (type: string) => void;
  status: string | null;
  setStatus: (status: string | null) => void;
  participantId: string | null;
  setParticipantId: (id: string | null) => void;
  search: string;
  setSearch: (q: string) => void;
  enrollmentEnabled: boolean;
  setEnrollmentEnabled: (v: boolean) => void;
  enrollmentStatus: string | null;
  setEnrollmentStatus: (s: string | null) => void;
  hasFilters: boolean;
  clearAll: () => void;
  /** Params ready to pass to useActivities() */
  apiParams: Record<string, string>;
}

export function useActivityFilters(): ActivityFilters {
  const [searchParams, setSearchParams] = useSearchParams();

  const viewMode = (searchParams.get("vista") as ViewMode) || "calendar";
  const typesRaw = searchParams.get("tipo");
  const types = new Set(typesRaw ? typesRaw.split(",").filter(Boolean) : []);
  const status = searchParams.get("estado");
  const participantId = searchParams.get("participante");
  const search = searchParams.get("q") || "";
  const enrollmentEnabled = searchParams.get("inscripciones") === "1";
  const enrollmentStatus = searchParams.get("estadoInscripcion");

  const update = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === "") {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => update({ vista: mode }),
    [update],
  );

  const toggleType = useCallback(
    (type: string) => {
      const next = new Set(types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      const value = [...next].join(",");
      update({ tipo: value || null });
    },
    [types, update],
  );

  const setStatus = useCallback(
    (s: string | null) => update({ estado: s }),
    [update],
  );

  const setParticipantId = useCallback(
    (id: string | null) => update({ participante: id }),
    [update],
  );

  const setSearch = useCallback(
    (q: string) => update({ q: q || null }),
    [update],
  );

  const setEnrollmentEnabled = useCallback(
    (v: boolean) => update({ inscripciones: v ? "1" : null }),
    [update],
  );

  const setEnrollmentStatus = useCallback(
    (s: string | null) => update({ estadoInscripcion: s }),
    [update],
  );

  const hasFilters =
    types.size > 0 ||
    !!status ||
    !!participantId ||
    !!search ||
    enrollmentEnabled ||
    !!enrollmentStatus;

  const clearAll = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams();
      // Preserve view mode only
      const vista = prev.get("vista");
      if (vista) next.set("vista", vista);
      return next;
    });
  }, [setSearchParams]);

  // Build API params — exclude internal types (TASK, MEETING)
  const apiParams: Record<string, string> = { excludeTypes: "TASK,MEETING" };
  if (types.size > 0 && types.size === 1) {
    apiParams.type = [...types][0];
  }
  if (status) apiParams.status = status;
  if (participantId) apiParams.participantId = participantId;
  if (search) apiParams.q = search;
  if (enrollmentEnabled) apiParams.enrollmentEnabled = "1";
  if (viewMode === "kanban") apiParams.limit = "500";
  else apiParams.limit = "50";

  return {
    viewMode,
    setViewMode,
    types,
    toggleType,
    status,
    setStatus,
    participantId,
    setParticipantId,
    search,
    setSearch,
    enrollmentEnabled,
    setEnrollmentEnabled,
    enrollmentStatus,
    setEnrollmentStatus,
    hasFilters,
    clearAll,
    apiParams,
  };
}
