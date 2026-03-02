import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot } from "lucide-react";
import { ChatLayout } from "@/components/ChatLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PremiumCard } from "@/components/PremiumCard";
import { VideoModal } from "@/components/VideoModal";
import { TypingIndicator } from "@/components/TypingIndicator";
import { useChatHistory, useSendMessage } from "@/hooks/use-chats";
import { useAuth } from "@/hooks/use-auth";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  conditionData?: any;
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: LocalMessage[];
}

const INITIAL_ASSISTANT_MESSAGE: LocalMessage = {
  id: "init",
  role: "assistant",
  content:
    "Hello! I'm Medibot, your AI medical assistant. How are you feeling today? Please describe your symptoms in detail.",
};

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LocalMessage[]>([INITIAL_ASSISTANT_MESSAGE]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState("");
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const hydratedHistoryRef = useRef(false);
  const hydratedSessionsRef = useRef(false);
  const { data: chatHistory, isLoading: isHistoryLoading } = useChatHistory();
  const { mutateAsync: sendMessage, isPending } = useSendMessage();
  const storageKey = user ? `medibot_sessions_${user.id}` : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  useEffect(() => {
    hydratedSessionsRef.current = false;
    hydratedHistoryRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!storageKey || hydratedSessionsRef.current) {
      return;
    }
    hydratedSessionsRef.current = true;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as ChatSession[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return;
      }
      const sorted = parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      setSessions(sorted);
      setActiveSessionId(sorted[0].id);
      setMessages(sorted[0].messages);
      hydratedHistoryRef.current = true;
    } catch {
      // ignore malformed storage entries
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || sessions.length === 0) {
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(sessions));
  }, [sessions, storageKey]);

  const buildSessionTitle = (msgs: LocalMessage[], fallbackIndex: number) => {
    const firstUser = msgs.find((m) => m.role === "user")?.content?.trim();
    if (firstUser && firstUser.length > 0) {
      return firstUser.slice(0, 40);
    }
    return `Consult ${fallbackIndex}`;
  };

  const persistActiveMessages = (nextMessages: LocalMessage[]) => {
    if (!activeSessionId) return;
    setSessions((prev) => {
      const existing = prev.find((s) => s.id === activeSessionId);
      if (!existing) return prev;
      const updated: ChatSession = {
        ...existing,
        title: buildSessionTitle(nextMessages, 1),
        updatedAt: Date.now(),
        messages: nextMessages,
      };
      const merged = [updated, ...prev.filter((s) => s.id !== activeSessionId)];
      return merged;
    });
  };

  useEffect(() => {
    if (hydratedHistoryRef.current || isHistoryLoading || !chatHistory) {
      return;
    }

    hydratedHistoryRef.current = true;
    if (chatHistory.length === 0) {
      if (!activeSessionId) {
        const sessionId = `session_${Date.now()}`;
        const firstSession: ChatSession = {
          id: sessionId,
          title: "Current Session",
          updatedAt: Date.now(),
          messages: [INITIAL_ASSISTANT_MESSAGE],
        };
        setSessions([firstSession]);
        setActiveSessionId(sessionId);
      }
      return;
    }

    const restoredMessages: LocalMessage[] = chatHistory.map((m) => ({
      id: String(m.id),
      role: m.role as "user" | "assistant",
      content: m.message,
    }));
    const sessionId = `session_${Date.now()}`;
    const restoredSession: ChatSession = {
      id: sessionId,
      title: buildSessionTitle(restoredMessages, 1),
      updatedAt: Date.now(),
      messages: restoredMessages,
    };
    setSessions([restoredSession]);
    setActiveSessionId(sessionId);
    setMessages(restoredMessages);
  }, [chatHistory, isHistoryLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isPending) return;

    const userMsg: LocalMessage = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => {
      const next = [...prev, userMsg];
      persistActiveMessages(next);
      return next;
    });
    setInput("");

    try {
      const response = await sendMessage({ message: text });
      
      const botMsg: LocalMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
        conditionData: response
      };
      
      setMessages(prev => {
        const next = [...prev, botMsg];
        persistActiveMessages(next);
        return next;
      });
    } catch (error) {
      // Handled by mutation globally, but could show local error message here
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const selected = sessions.find((s) => s.id === sessionId);
    if (!selected) return;
    setActiveSessionId(sessionId);
    setMessages(selected.messages);
  };

  const handleNewConsult = () => {
    const sessionId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: sessionId,
      title: `Consult ${sessions.length + 1}`,
      updatedAt: Date.now(),
      messages: [
        {
          id: `${Date.now()}`,
          role: "assistant",
          content: "New consultation started. How can I help you today?",
        },
      ],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    setMessages(newSession.messages);
  };

  const sessionItems = sessions.map((s, idx) => ({
    id: s.id,
    title: s.title || `Consult ${idx + 1}`,
    preview: s.messages[s.messages.length - 1]?.content,
  }));

  const handleOpenVideo = (url?: string) => {
    setCurrentVideo(url || "https://www.youtube.com/embed/dQw4w9WgXcQ"); // fallback demo
    setIsVideoModalOpen(true);
  };

  return (
    <ChatLayout
      onNewChat={handleNewConsult}
      sessions={sessionItems}
      activeSessionId={activeSessionId || undefined}
      onSelectSession={handleSelectSession}
    >
      <div className="flex flex-col h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                    
                    {/* Chat Bubble */}
                    <div
                      className={`p-4 rounded-2xl ${
                        msg.role === "user" 
                          ? "bg-gradient-to-r from-primary to-primary/90 text-white rounded-tr-sm shadow-md"
                          : "glass-card text-foreground rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>

                    {/* Premium Card for Diagnoses */}
                    {msg.conditionData?.condition && (
                      <PremiumCard
                        condition={msg.conditionData.condition}
                        severity={msg.conditionData.severity}
                        explanation={msg.conditionData.reply}
                        firstAidPlan={msg.conditionData.firstAidPlan}
                        specialist={msg.conditionData.specialist}
                        hospitalRecommendation={msg.conditionData.hospitalRecommendation}
                        onShowDemo={() => handleOpenVideo(msg.conditionData.arVideo || msg.conditionData.youtubeRemedy)}
                      />
                    )}

                    {/* Follow Up Questions Chips */}
                    {msg.conditionData?.followUpQuestions?.length > 0 && (
                      <div className="flex flex-col gap-3 mt-4 w-full">
                        {msg.conditionData.followUpQuestions.map((q: string, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="bg-white/60 backdrop-blur-md border border-primary/20 text-primary px-4 py-2 rounded-2xl text-sm font-medium shadow-sm"
                          >
                            {q}
                          </motion.div>
                        ))}
                        {(msg.conditionData.followUpOptions?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {msg.conditionData.followUpOptions.map((opt: string, optIndex: number) => (
                              <Button
                                key={`${msg.id}-opt-${optIndex}`}
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => handleSend(opt)}
                                disabled={isPending}
                              >
                                {opt}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TypingIndicator />
              </motion.div>
            )}
            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-6 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
              className="relative flex items-center glass-card rounded-full p-1 border-white/60"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ml-2 shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your symptoms..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-4 text-base h-14"
                disabled={isPending}
              />
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-full shrink-0 mr-1 shadow-md w-12 h-12"
                disabled={!input.trim() || isPending}
              >
                <Send className="w-5 h-5 ml-1" />
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
              Medibot can make mistakes. Always consult a real doctor for medical advice.
            </p>
          </div>
        </div>
      </div>

      <VideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
        videoUrl={currentVideo}
      />
    </ChatLayout>
  );
}
