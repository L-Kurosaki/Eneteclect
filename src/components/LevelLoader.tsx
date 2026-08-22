import React, { useState } from 'react';
import { Play, UploadCloud } from 'lucide-react';

interface Props {
  onLoad: (data: any) => void;
}

export function LevelLoader({ onLoad }: Props) {
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.run || !json.towns) throw new Error("Invalid level JSON structure");
        onLoad(json);
      } catch (err: any) {
        setError(err.message || 'Failed to parse JSON');
      }
    };
    reader.readAsText(file);
  };

  const loadExample = () => {
    const example = {
      "run": { "total_ticks": 500, "starting_town": "Demacia", "starting_enteloot": 200 },
      "towns": {
        "Demacia": {
          "production": { "rate": 10, "resources": { "wheat": 2, "sheep": 2 } },
          "upgrades": [],
          "affinities": ["crafting"],
          "item-rates": { "bread": 10, "pottery": 50, "fish-n-chips": 30, "wooden-crafts": 40, "stone-works": 60, "wool-garments": 30, "stew": 30, "furniture": 50, "roof-tiles": 55 },
          "enteloot": { "rate": 5, "amount": 1000 }
        },
        "Piltover": {
          "production": { "rate": 10, "resources": { "fish": 2, "sheep": 2 } },
          "upgrades": [],
          "affinities": ["crafting"],
          "item-rates": { "bread": 40, "pottery": 70, "fish-n-chips": 10, "wooden-crafts": 50, "stone-works": 60, "wool-garments": 60, "stew": 25, "furniture": 65, "roof-tiles": 70 },
          "enteloot": { "rate": 2, "amount": 400 }
        }
      },
      "nodes": {
        "N1": { "type": "fields", "resource": "wheat", "yield": 6, "gather-time": 2 }
      },
      "routes": [
        { "between": ["Demacia", "N1"], "weight": 2, "toll": 0 },
        { "between": ["Demacia", "Piltover"], "weight": 5, "toll": 0 }
      ]
    };
    onLoad(example);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-800 p-8">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 border border-slate-100">
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-6 mx-auto">
          <UploadCloud className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-900 mb-2">Age of Enteland</h1>
        <p className="text-center text-slate-500 mb-8">Upload a level JSON file to begin simulation.</p>
        
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-slate-400">JSON or TXT files</p>
          </div>
          <input type="file" className="hidden" accept=".json,.txt" onChange={handleFileUpload} />
        </label>

        {error && <p className="mt-4 text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded-md">{error}</p>}
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500 mb-3">Or try it out with sample data:</p>
          <button 
            onClick={loadExample}
            className="flex items-center justify-center w-full gap-2 bg-indigo-50 text-indigo-700 py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
          >
            <Play className="w-4 h-4" />
            Load Example Level
          </button>
        </div>
      </div>
    </div>
  );
}
