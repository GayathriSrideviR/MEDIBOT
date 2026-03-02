import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "./ui/button";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
}

export function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps) {
  const isLocalMp4 = Boolean(
    videoUrl &&
      (videoUrl.toLowerCase().endsWith(".mp4") ||
        videoUrl.toLowerCase().startsWith("/ar/")),
  );
  const isYouTube = Boolean(
    videoUrl &&
      (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")),
  );
  const iframeSrc =
    isYouTube && videoUrl
      ? `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}autoplay=1&loop=1&controls=1&mute=0`
      : videoUrl;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/20"
          >
            <div className="absolute top-4 right-4 z-10">
              <Button size="icon" variant="glass" onClick={onClose} className="rounded-full bg-black/40 text-white border-white/20 hover:bg-black/60 w-10 h-10">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {videoUrl ? (
              isLocalMp4 ? (
                <video
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <iframe
                  src={iframeSrc}
                  className="w-full h-full object-cover"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white/50 space-y-4">
                <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white/80 animate-spin" />
                <p className="font-display font-medium">Loading AR Demo...</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
