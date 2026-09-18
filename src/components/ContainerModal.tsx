import React, { useState, useEffect } from 'react';
import { Sliders, RotateCcw, Compass, Save } from 'lucide-react';
import type { ContainerConfig } from '../types.ts';

interface ContainerModalProps {
  container: ContainerConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ContainerConfig) => Promise<void>;
}

export const ContainerModal: React.FC<ContainerModalProps> = ({
  container,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<ContainerConfig | null>(null);

  useEffect(() => {
    if (container) {
      setFormData({ ...container });
    }
  }, [container]);

  if (!isOpen || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      await onSave(formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-xl max-w-md w-full p-5 shadow-2xl border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-950 text-sky-400 border border-neutral-800">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Behälter & Servo kalibrieren</h3>
              <p className="text-[11px] text-neutral-400">{formData.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 text-sm font-semibold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">Bezeichnung</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-200 focus:outline-hidden focus:border-neutral-700"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-semibold mb-1">Beschreibung</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-200 focus:outline-hidden focus:border-neutral-700"
            />
          </div>

          {/* Servo Angle Calibration */}
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Weichenwinkel (Servomotor)</span>
              </div>
              <span className="font-mono text-sm font-bold text-sky-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                {formData.servoAngle}°
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="180"
              step="1"
              value={formData.servoAngle}
              onChange={e => setFormData({ ...formData, servoAngle: Number(e.target.value) })}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <p className="text-[10px] text-neutral-500">
              Winkel der Rutsche in Grad (0° - 180°), an den der Servo dreht.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Max. Kapazität</label>
              <input
                type="number"
                min="1"
                max="200"
                value={formData.capacity}
                onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-neutral-200 focus:outline-hidden focus:border-neutral-700"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-semibold mb-1">Aktueller Zählerstand</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.count}
                  onChange={e => setFormData({ ...formData, count: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-950 font-mono text-neutral-200 focus:outline-hidden focus:border-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, count: 0 })}
                  className="p-2 border border-neutral-800 rounded-lg hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                  title="Auf 0 zurücksetzen"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
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
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Änderungen speichern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
