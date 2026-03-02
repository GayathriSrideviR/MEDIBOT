import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "../lib/api";
import { z } from "zod";

type ChatInput = z.infer<typeof api.chats.create.input>;
type BotResponse = z.infer<typeof api.chats.create.responses[200]>;
type ChatHistory = z.infer<typeof api.chats.list.responses[200]>;

export function useChatHistory() {
  return useQuery<ChatHistory>({
    queryKey: [api.chats.list.path],
    queryFn: () => fetchWithAuth(api.chats.list.path),
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ChatInput) => {
      const res = await fetchWithAuth(api.chats.create.path, {
        method: api.chats.create.method,
        body: JSON.stringify(data),
      });
      return res as BotResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chats.list.path] });
    }
  });
}
