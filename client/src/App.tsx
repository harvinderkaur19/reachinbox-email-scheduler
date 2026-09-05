import { Mail, Clock, Server, Layers } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8 bg-slate-900/60 p-8 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
        <div className="flex justify-center items-center space-x-3">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
            ReachInbox Email Scheduler
          </h1>
        </div>

        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Project Scaffolding Complete. Full-stack monorepo setup initialized with React, Vite, TypeScript, Tailwind CSS, Node.js, and Express.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-start space-x-3">
            <Layers className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Monorepo Setup</h3>
              <p className="text-xs text-slate-400 mt-1">Client & Server structured independently.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-start space-x-3">
            <Clock className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Frontend Client</h3>
              <p className="text-xs text-slate-400 mt-1">Vite + React + TS + Tailwind CSS.</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-start space-x-3">
            <Server className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-slate-200">Backend Server</h3>
              <p className="text-xs text-slate-400 mt-1">Node.js + Express + TypeScript.</p>
            </div>
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-500 border-t border-slate-800/80 flex items-center justify-between">
          <span>Status: Scaffolding Ready</span>
          <span className="font-mono text-indigo-400/80">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
