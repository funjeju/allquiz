"use client";

import { motion } from "framer-motion";
import { Zap, Users } from "lucide-react";

interface CategoryCardProps {
  category: string;
  count: number;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryCard({ category, count, icon, active, onClick }: CategoryCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer group p-6 rounded-3xl border ${
        active 
          ? "bg-primary/10 border-primary shadow-[0_0_30px_rgba(168,85,247,0.15)]" 
          : "bg-card border-border hover:border-primary/50"
      }`}
    >
      {/* Background Glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-colors" />

      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:text-primary transition-colors"}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-accent">
          <Zap className="w-3 h-3 fill-accent" />
          HOT
        </div>
      </div>

      <h3 className="text-xl font-bold mb-1">{category}</h3>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        {count.toLocaleString()}명이 대결 중
      </div>

      {/* Battle Button */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary">
          Enter Arena
        </span>
        <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
          <Zap className="w-4 h-4 group-hover:fill-white text-muted-foreground group-hover:text-white" />
        </div>
      </div>
    </motion.div>
  );
}
