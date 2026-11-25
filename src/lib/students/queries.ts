import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStudent, getStudent, listAllStudents, listStudents, updateStudent } from "@/lib/api/students";
import type { CreateStudentInput, ListStudentsInput, UpdateStudentInput } from "./schema";

export const studentKeys = {
  center: (centerId: string) => ["students", centerId] as const,
  all: (centerId: string) => ["students", centerId, "all"] as const,
  list: (params: ListStudentsInput) => ["students", params.centerId, "list", params] as const,
  one: (centerId: string, code: string) => ["students", centerId, "one", code] as const,
};

export const useAllStudents = (centerId: string) =>
  useQuery({ queryKey: studentKeys.all(centerId), queryFn: () => listAllStudents({ data: { centerId } }), staleTime: 30_000 });

export const useStudentList = (params: ListStudentsInput) =>
  useQuery({ queryKey: studentKeys.list(params), queryFn: () => listStudents({ data: params }), placeholderData: keepPreviousData, staleTime: 15_000 });

export const useStudent = (centerId: string, code: string) =>
  useQuery({ queryKey: studentKeys.one(centerId, code), queryFn: () => getStudent({ data: { centerId, code } }) });

/** Mutations refresh every student query of the center, so lists, profile and the demo screens agree. */
export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStudentInput) => createStudent({ data: input }),
    onSuccess: (_row, input) => qc.invalidateQueries({ queryKey: studentKeys.center(input.centerId) }),
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateStudentInput) => updateStudent({ data: input }),
    onSuccess: (row, input) => {
      qc.setQueryData(studentKeys.one(input.centerId, input.code), row);
      return qc.invalidateQueries({ queryKey: studentKeys.center(input.centerId) });
    },
  });
}

/** Server errors arrive as Error instances with a user-facing message. */
export const errorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
