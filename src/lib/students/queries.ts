import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStudentSource } from "./source";
import type { CreateStudentInput, ListStudentsInput, UpdateStudentInput } from "./schema";

export const studentKeys = {
  center: (centerId: string) => ["students", centerId] as const,
  all: (centerId: string) => ["students", centerId, "all"] as const,
  list: (params: ListStudentsInput) => ["students", params.centerId, "list", params] as const,
  one: (centerId: string, code: string) => ["students", centerId, "one", code] as const,
};

/* Every hook reads from the active StudentSource: Supabase in the console, the local store in the demo. */

export const useAllStudents = (centerId: string) => {
  const src = useStudentSource();
  return useQuery({
    queryKey: studentKeys.all(centerId),
    queryFn: () => src.listAll(centerId),
    staleTime: 30_000,
  });
};

export const useStudentList = (params: ListStudentsInput) => {
  const src = useStudentSource();
  return useQuery({
    queryKey: studentKeys.list(params),
    queryFn: () => src.list(params),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
};

export const useStudent = (centerId: string, code: string) => {
  const src = useStudentSource();
  return useQuery({
    queryKey: studentKeys.one(centerId, code),
    queryFn: () => src.get(centerId, code),
  });
};

/** Mutations refresh every student query of the center, so lists, profile and the demo screens agree. */
export function useCreateStudent() {
  const qc = useQueryClient();
  const src = useStudentSource();
  return useMutation({
    mutationFn: (input: CreateStudentInput) => src.create(input),
    onSuccess: (_row, input) =>
      qc.invalidateQueries({ queryKey: studentKeys.center(input.centerId) }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  const src = useStudentSource();
  return useMutation({
    mutationFn: (input: UpdateStudentInput) => src.update(input),
    onSuccess: (row, input) => {
      qc.setQueryData(studentKeys.one(input.centerId, input.code), row);
      return qc.invalidateQueries({ queryKey: studentKeys.center(input.centerId) });
    },
  });
}

/** Server errors arrive as Error instances with a user-facing message. */
export const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;
