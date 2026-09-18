import React from 'react';
import { 
  Award, 
  Flame, 
  CircleDot, 
  AlertTriangle, 
  RotateCcw, 
  Compass, 
  Sliders, 
  Layers,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import type { ContainerConfig, SorterSystemStatus } from '../types.ts';

interface ContainersViewProps {
  status: SorterSystemStatus;
  onControl: (action: string, value?: unknown) => Promise<void>;
  onEditContainer: (container: ContainerConfig) => void;
  highlightContainerId?: string | null;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({ 
  status, 
  onControl,
  onEditContainer,
  highlightContainerId,
  soundEnabled = false,
  onToggleSound
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'container_1':
        return <CircleDot className="w-5 h-5 text-blue-500" />;
      case 'container_2':
        return <Flame className="w-5 h-5 text-amber-500" />;
      case 'container_3':
        return <Award className="w-5 h-5 text-emerald-500" />;
      case 'container_4':
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    }
  };

  const totalCapacity = status.containers.reduce((acc, c) => acc + c.capacity, 0);
  const totalBalls = status.totalBalls;

  return (
    <section className="space-y-4">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              Gesamtzahl Bälle
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" title="Echtzeit-Zähler aktiv" />
            </span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono transition-all duration-300">
              {status.totalBalls}
            </span>
            <span className="text-xs text-slate-500">Stück erfasst</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sortierrate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {status.ballsPerMinute}
            </span>
            <span className="text-xs text-slate-500">Bälle / Min</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Aktiver Weichenwinkel</span>
            <Compass className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-700 tracking-tight font-mono">
              {status.currentServoAngle}°
            </span>
            <span className="text-xs text-slate-500">SG90 Servo</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Zähler-Aktionen</span>
            <button
              onClick={() => {
                if (confirm('Möchtest du alle Zähler wirklich auf 0 zurücksetzen?')) {
                  onControl('reset_counts');
                }
              }}
              className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              title="Alle Zähler zurücksetzen"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-600">4 Behälter online</span>
            {onToggleSound && (
              <button
                onClick={onToggleSound}
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  soundEnabled 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
                title="Akustisches Signal beim Sortieren umschalten"
              >
                {soundEnabled ? '🔔 Ton an' : '🔕 Ton aus'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Distribution Ratio Bar across containers */}
      {totalBalls > 0 && (
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Verteilung der sortierten Bälle</span>
            <span className="font-mono">{totalBalls} Bälle gesamt</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 flex overflow-hidden">
            {status.containers.map(c => {
              const pct = totalBalls > 0 ? (c.count / totalBalls) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={c.id}
                  style={{ width: `${pct}%`, backgroundColor: c.colorHex }}
                  className="h-full transition-all duration-300"
                  title={`${c.name}: ${c.count} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Container Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {status.containers.map((container, index) => {
          const fillPercent = Math.min(100, Math.round((container.count / container.capacity) * 100));
          const isCurrentActive = status.currentServoAngle === container.servoAngle;
          const isJustSorted = highlightContainerId === container.id;
          const isFull = container.count >= container.capacity;

          return (
            <div
              key={container.id}
              className={`bg-white rounded-xl border transition-all duration-300 shadow-2xs relative flex flex-col justify-between p-4 ${
                isJustSorted
                  ? 'ring-4 ring-emerald-400 border-emerald-500 scale-[1.02] shadow-md'
                  : isCurrentActive
                  ? 'border-blue-500 ring-2 ring-blue-500/10'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              {/* Highlight pop badge */}
              {isJustSorted && (
                <div className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-md animate-bounce">
                  +1 Ball sortiert!
                </div>
              )}

              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-200/80"
                      style={{ borderLeftColor: container.colorHex, borderLeftWidth: '3px' }}
                    >
                      {getIcon(container.id)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">#0{index + 1}</span>
                        <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                          {container.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[180px]">
                        {container.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onEditContainer(container)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Behälter-Einstellungen & Servowinkel anpassen"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Big Count Display */}
                <div className="mt-4 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl font-extrabold tracking-tight font-mono transition-transform duration-300 ${
                      isJustSorted ? 'scale-110 text-emerald-600' : 'text-slate-900'
                    }`}>
                      {container.count}
                    </span>
                    <span className="text-xs text-slate-400">/ {container.capacity} max</span>
                  </div>

                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                    isFull 
                      ? 'bg-rose-100 text-rose-700 font-bold animate-pulse' 
                      : fillPercent > 80 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {fillPercent}% voll
                  </span>
                </div>

                {/* Capacity Progress Bar */}
                <div className="mt-2 w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${fillPercent}%`,
                      backgroundColor: isFull ? '#ef4444' : container.colorHex
                    }}
                  />
                </div>
              </div>

              {/* Bottom Actions & Servo Routing */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-600">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium">{container.servoAngle}°</span>
                </div>

                <button
                  onClick={() => onControl('test_container', container.id)}
                  disabled={status.emergencyStop}
                  className={`px-2.5 py-1 rounded-md font-medium text-[11px] flex items-center gap-1 transition-all ${
                    isCurrentActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  } disabled:opacity-50`}
                  title="Servomotor Weiche gezielt auf diesen Behälter ansteuern"
                >
                  <span>Ansteuern</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
