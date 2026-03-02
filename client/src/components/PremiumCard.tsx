import { motion } from "framer-motion";
import { Activity, Stethoscope, MapPin, Phone, PlayCircle, ShieldPlus } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface PremiumCardProps {
  condition: string;
  severity: string;
  explanation: string;
  firstAidPlan?: string[];
  specialist?: string;
  hospitalRecommendation?: {
    doctorName: string;
    specialization: string;
    hospital: string;
    location: string;
    phone: string;
  } | null;
  onShowDemo: () => void;
}

export function PremiumCard({ 
  condition, 
  severity, 
  explanation, 
  firstAidPlan,
  specialist,
  hospitalRecommendation,
  onShowDemo 
}: PremiumCardProps) {
  
  const getSeverityVariant = (sev: string) => {
    const s = sev.toLowerCase();
    if (s.includes("high") || s.includes("severe") || s.includes("emergency")) return "destructive";
    if (s.includes("medium") || s.includes("moderate")) return "warning";
    return "success";
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: 20 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
      className="glass-card rounded-3xl p-6 md:p-8 mt-4 w-full max-w-2xl overflow-hidden relative"
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 text-white">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-bold font-display text-foreground">{condition}</h3>
              <p className="text-muted-foreground font-medium text-sm mt-1 flex items-center gap-1">
                <ShieldPlus className="w-4 h-4 text-primary" /> Analysis Complete
              </p>
            </div>
          </div>
          <Badge variant={getSeverityVariant(severity)} className="uppercase tracking-wider px-4 py-1.5 text-xs">
            {severity} Severity
          </Badge>
        </div>

        {/* Explanation */}
        <p className="text-foreground/80 leading-relaxed mb-8">
          {explanation}
        </p>

        {firstAidPlan && firstAidPlan.length > 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-sm mb-6">
            <h4 className="font-display font-bold text-lg text-foreground mb-3">First Aid Plan</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/80">
              {firstAidPlan.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Doctor Recommendation */}
        {hospitalRecommendation && (
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-sm mb-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 border-2 border-white flex items-center justify-center shrink-0">
              <Stethoscope className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-display font-bold text-lg text-foreground">Dr. {hospitalRecommendation.doctorName}</h4>
              <p className="text-primary font-semibold text-sm mb-2">{hospitalRecommendation.specialization || specialist}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {hospitalRecommendation.hospital}, {hospitalRecommendation.location}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {hospitalRecommendation.phone}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onShowDemo} className="w-full sm:w-auto shadow-primary/20 gap-2">
            <PlayCircle className="w-5 h-5" />
            Show First Aid Demo
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
