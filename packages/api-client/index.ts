import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUser, CreatePost, UpdatePost } from "@repo/validators";
import type { User, Post, PostWithAuthor } from "@repo/types";

let BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function configure(config: { baseURL: string }) {
  BASE_URL = config.baseURL;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

export const queryKeys = {
  users: () => ["users"] as const,
  user: (id: number) => ["users", id] as const,
  posts: () => ["posts"] as const,
  post: (id: number) => ["posts", id] as const,
};

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users(),
    queryFn: () => get<User[]>("/users"),
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: queryKeys.user(id),
    queryFn: () => get<User>(`/users/${id}`),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateUser) => post<User>("/users", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users() }),
  });
}

export function usePosts() {
  return useQuery({
    queryKey: queryKeys.posts(),
    queryFn: () => get<PostWithAuthor[]>("/posts"),
  });
}

export function usePost(id: number) {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => get<PostWithAuthor>(`/posts/${id}`),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePost) => post<Post>("/posts", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.posts() }),
  });
}

export function useUpdatePost(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePost) => patch<Post>(`/posts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts() });
      queryClient.invalidateQueries({ queryKey: queryKeys.post(id) });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.posts() }),
  });
}
