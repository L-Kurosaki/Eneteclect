/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LevelLoader } from './components/LevelLoader';
import { GameDashboard } from './components/GameDashboard';
import { GameState, LevelData, getInitialState, Action, executeAction } from './game/engine';
import { CONSTANTS } from './game/constants';
import { Map, MapPin, Package, Clock, Hammer, LogOut, Download, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [state, setState] = useState<GameState | null>(null);

  const handleLoadLevel = (data: LevelData) => {
    setLevel(data);
    setState(getInitialState(data));
  };

  const handleAction = (action: Action) => {
    if (!state || !level) return;
    const newState = executeAction(JSON.parse(JSON.stringify(state)), action, level);
    setState(newState);
  };

  const handleExport = () => {
    if (!state) return;
    const submission = { actions: state.log.map(l => l.action) };
    const blob = new Blob([JSON.stringify(submission, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'submission.txt';
    a.click();
  };

  if (!level || !state) {
    return <LevelLoader onLoad={handleLoadLevel} />;
  }

  const isTown = !!level.towns[state.location];
  const node = level.nodes[state.location];
  
  // Available routes from current location
  const availableRoutes = level.routes.filter(r => r.between.includes(state.location));
  const connectedNodes = availableRoutes.map(r => r.between[0] === state.location ? r.between[1] : r.between[0]);
  const uniqueDestinations = Array.from(new Set(connectedNodes));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 flex flex-col h-screen">
      <header className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Map className="w-6 h-6 text-indigo-600" /> Age of Enteland
        </h1>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
            <Download className="w-4 h-4" /> Export Actions
          </button>
          <button onClick={() => { setLevel(null); setState(null); }} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 transition">
            <LogOut className="w-4 h-4" /> Change Level
          </button>
        </div>
      </header>

      <GameDashboard state={state} level={level} />

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column: Actions */}
        <div className="col-span-8 flex flex-col gap-6 overflow-y-auto pr-2">
          
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" /> Travel
            </h2>
            <div className="flex flex-wrap gap-3">
              {uniqueDestinations.map(dest => {
                const routesToDest = availableRoutes.filter(r => r.between.includes(dest));
                return routesToDest.map((r, i) => (
                  <button 
                    key={`${dest}-${i}`}
                    onClick={() => handleAction({ type: 'travel', destination: dest, fast: r.toll > 0 })}
                    className={`px-4 py-3 border rounded-lg text-left transition-colors ${r.toll > 0 ? 'bg-amber-50 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <div className="font-medium text-slate-900">{dest}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {r.weight} ticks
                      {r.toll > 0 && <span className="ml-2 text-amber-600 flex items-center gap-1 font-medium"><AlertCircle className="w-3 h-3"/> Toll: {r.toll}</span>}
                    </div>
                  </button>
                ));
              })}
              {uniqueDestinations.length === 0 && <p className="text-slate-500 italic text-sm">No connected locations.</p>}
            </div>
          </section>

          {node && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Hammer className="w-5 h-5 text-emerald-500" /> Gather
              </h2>
              <button 
                onClick={() => handleAction({ type: 'gather' })}
                className="px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium hover:bg-emerald-100 transition-colors"
              >
                Gather {node.yield} {node.resource} ({node['gather-time']} ticks)
              </button>
            </section>
          )}

          {isTown && (
            <div className="grid grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Market</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Buy Raw Materials</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(level.towns[state.location].production.resources).map(res => {
                        const price = (CONSTANTS.resources as any)[res]?.buy_price;
                        if (!price) return null;
                        return (
                          <button key={`buy-${res}`} onClick={() => handleAction({ type: 'buy', item: res, quantity: 1 })} className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition">
                            {res} (Costs {price})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Sell Inventory</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(state.inventory).map(([item, qty]) => {
                        if (qty <= 0) return null;
                        return (
                          <button key={`sell-${item}`} onClick={() => handleAction({ type: 'sell', item, quantity: qty })} className="px-3 py-1.5 text-sm bg-blue-50 border border-blue-200 text-blue-800 rounded hover:bg-blue-100 transition">
                            Sell All {item} ({qty})
                          </button>
                        );
                      })}
                      {Object.keys(state.inventory).every(k => state.inventory[k] === 0) && <p className="text-xs text-slate-400">Inventory empty</p>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Crafting</h2>
                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                  {Object.keys(CONSTANTS.recipes).map(recipe => (
                    <button key={recipe} onClick={() => handleAction({ type: 'craft', item: recipe, quantity: 1 })} className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition text-sm">
                      <div className="font-medium text-slate-800 capitalize">{recipe.replace(/-/g, ' ')}</div>
                      <div className="text-xs text-slate-500">{JSON.stringify((CONSTANTS.recipes as any)[recipe].inputs).replace(/["{}]/g, '')}</div>
                    </button>
                  ))}
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">Components</h3>
                    {Object.keys(CONSTANTS.components).map(comp => (
                      <button key={comp} onClick={() => handleAction({ type: 'craft', item: comp, quantity: 1 })} className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100 transition text-sm mb-1">
                        <div className="font-medium text-slate-700 capitalize">{comp.replace(/-/g, ' ')}</div>
                        <div className="text-xs text-slate-500">{JSON.stringify((CONSTANTS.components as any)[comp].inputs).replace(/["{}]/g, '')}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>

        {/* Right Column: Inventory & Log */}
        <div className="col-span-4 flex flex-col gap-6 overflow-hidden min-h-0">
          
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-500" /> Inventory
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Object.entries(state.inventory).filter(([_, qty]) => qty > 0).map(([item, qty]) => (
                <div key={item} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700 capitalize">{item.replace(/-/g, ' ')}</span>
                  <span className="text-sm text-slate-500">{qty}</span>
                </div>
              ))}
              {Object.keys(state.inventory).every(k => state.inventory[k] === 0) && (
                <p className="col-span-2 text-sm text-slate-500 italic text-center py-4">Inventory is empty</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">Action Log</h2>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {state.log.map((log, idx) => (
                <div key={idx} className={`p-3 rounded-lg text-sm ${log.valid ? 'bg-slate-50 border border-slate-100' : 'bg-red-50 border border-red-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900 uppercase text-xs tracking-wider">
                      {log.action.type} {log.action.item || log.action.destination || log.action.upgrade || ''}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" /> T:{log.tick}
                    </span>
                  </div>
                  {log.valid ? (
                    <p className="text-slate-600 flex items-start gap-1.5 mt-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {log.details}
                    </p>
                  ) : (
                    <p className="text-red-600 flex items-start gap-1.5 mt-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {log.error}
                    </p>
                  )}
                </div>
              ))}
              {state.log.length === 0 && (
                <p className="text-sm text-slate-500 text-center italic mt-10">No actions taken yet.</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
