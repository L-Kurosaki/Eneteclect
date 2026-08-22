import React from 'react';
import { GameState, LevelData } from '../game/engine';

export function GameDashboard({ state, level }: { state: GameState, level: LevelData }) {
  const isTown = !!level.towns[state.location];
  const node = level.nodes[state.location];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Time</h3>
        <div className="text-2xl font-bold text-slate-900">
          Tick {state.tick} <span className="text-sm font-normal text-slate-500">/ {state.total_ticks}</span>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Location</h3>
        <div className="text-2xl font-bold text-slate-900">
          {state.location}
          {isTown ? <span className="ml-2 text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Town</span> : 
           node ? <span className="ml-2 text-xs font-medium px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">{node.type}</span> : null}
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Wealth</h3>
        <div className="text-2xl font-bold text-amber-500">
          {state.enteloot.toLocaleString()} <span className="text-sm font-medium">Enteloot</span>
        </div>
      </div>
    </div>
  );
}
