import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, LogOut, Menu, X, HeartPulse } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ChatLayoutProps {
  children: ReactNode;
  onNewChat: () => void;
  sessions: Array<{
    id: string;
    title: string;
    preview?: string;
  }>;
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
}

export function ChatLayout({
  children,
  onNewChat,
  sessions,
  activeSessionId,
  onSelectSession,
}: ChatLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-72 glass-panel flex flex-col h-full transform transition-transform duration-300 ease-in-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg text-white">
              <HeartPulse className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">MEDIBOT</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-4 pb-4">
          <Button onClick={() => { onNewChat(); setSidebarOpen(false); }} className="w-full gap-2 justify-start shadow-sm" variant="glass">
            <Plus className="w-4 h-4" />
            New Consult
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 scrollbar-hide">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Recent</div>
          {sessions.length === 0 ? (
            <Button
              variant="ghost"
              className="w-full justify-start text-left font-medium h-auto py-3 px-3"
              disabled
            >
              <MessageSquare className="w-4 h-4 mr-3 shrink-0" />
              <span className="truncate text-muted-foreground">No consult history</span>
            </Button>
          ) : (
            sessions.map((session) => (
              <Button
                key={session.id}
                variant="ghost"
                onClick={() => {
                  onSelectSession(session.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full justify-start text-left font-medium h-auto py-3 px-3",
                  session.id === activeSessionId
                    ? "bg-primary/5 text-primary"
                    : "text-foreground/80",
                )}
              >
                <MessageSquare className="w-4 h-4 mr-3 shrink-0" />
                <span className="truncate">{session.title}</span>
              </Button>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/30 bg-white/30 backdrop-blur-md">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground font-bold">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 gap-2" onClick={logout}>
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className="h-16 flex items-center px-4 md:hidden bg-white/70 backdrop-blur-md border-b border-border sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="w-6 h-6" />
          </Button>
          <div className="flex-1 text-center font-display font-bold">MEDIBOT</div>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>
        
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
