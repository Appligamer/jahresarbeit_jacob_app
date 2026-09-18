import React, { useState } from 'react';
import { Sparkles, Award, Flame, CircleDot, AlertTriangle, Play } from 'lucide-react';
import type { BallColor, BallQuality } from '../types.ts';

interface SimulateBallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (data: { color: BallColor; diameterMm: number; quality: BallQuality }) => Promise<void>;
}

export const SimulateBallModal: React.FC<SimulateBallModalProps> = ({
  isOpen,
  onClose,
  onSimulate
}) => {
  const [color, setColor] = useState<BallColor>('white');
  const [diameterMm, setDiameterMm] = useState<number>(40.02);
  const [quality, setQuality] = useState<BallQuality>('good');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handlePreset = (pColor: BallColor, pDiam: number, pQual: BallQuality) => {
    setColor(pColor);
    setDiameterMm(pDiam);
    setQuality(pQual);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSimulate({ color, diameterMm, quality });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-950 text-sky-400 border border-neutral-800">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Ball-Durchlauf simulieren</h3>
              <p className="text-[11px] text-neutral-400">Testet Farbsensor, Durchmesser & Sortierweiche</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-sm font-semibold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-neutral-300">Schnell-Vorlagen:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePreset('white', 40.01, 'good')}
              className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-sky-500/40 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block text-neutral-200">3-Sterne Weiß</span>
                <span className="text-[10px] text-neutral-400 font-mono">40.01 mm • Makellos</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('orange', 39.95, 'training')}
              className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-red-500/40 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block text-neutral-200">Rot Training</span>
                <span className="text-[10px] text-neutral-400 font-mono">39.95 mm • Standard</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('white', 40.18, 'good')}
              className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-sky-500/40 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <CircleDot className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block text-neutral-200">Standard Weiß</span>
                <span className="text-[10px] text-neutral-400 font-mono">40.18 mm • Spielball</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handlePreset('white', 38.65, 'damaged')}
              className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:border-rose-500/40 text-left transition-colors flex items-center gap-2 cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block text-neutral-200">Delle / Defekt</span>
                <span className="text-[10px] text-neutral-400 font-mono">38.65 mm • Ausschuss</span>
              </div>
            </button>
          </div>
        </div>

        {/* Custom Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-neutral-800 text-xs">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">Farbe des Balls</label>
            <select
              value={color}
              onChange={e => setColor(e.target.value as BallColor)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 font-medium text-neutral-200 focus:outline-hidden focus:border-neutral-700"
            >
              <option value="white">Weiß</option>
              <option value="orange">Rot</option>
              <option value="unknown">Unbekannt / Defekt</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Durchmesser (mm)</label>
              <input
                type="number"
                step="0.05"
                min="35"
                max="45"
                value={diameterMm}
                onChange={e => setDiameterMm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-neutral-200 focus:outline-hidden focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Oberflächenqualität</label>
              <select
                value={quality}
                onChange={e => setQuality(e.target.value as BallQuality)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-200 focus:outline-hidden focus:border-neutral-700"
              >
                <option value="good">Makellos (3-Sterne)</option>
                <option value="training">Standard / Training</option>
                <option value="damaged">Delle / Beschädigt</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 font-medium cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ball einspeisen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
