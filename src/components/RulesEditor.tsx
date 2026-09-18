import React, { useState, useMemo } from 'react';
import { 
  Settings2, 
  Plus, 
  Check, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Filter,
  Sparkles,
  Scale,
  CircleDot,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { SortingRule, ContainerConfig, BallColor, BallQuality } from '../types.ts';

interface RulesEditorProps {
  rules: SortingRule[];
  containers: ContainerConfig[];
  onUpdateRules: (newRules: SortingRule[]) => Promise<void>;
}

export const RulesEditor: React.FC<RulesEditorProps> = ({ 
  rules, 
  containers, 
  onUpdateRules 
}) => {
  const [editingRule, setEditingRule] = useState<SortingRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Live Rule Tester Sandbox state
  const [testColor, setTestColor] = useState<BallColor>('white');
  const [testDiameter, setTestDiameter] = useState<number>(40.02);
  const [testWeight, setTestWeight] = useState<number>(2.71);
  const [testQuality, setTestQuality] = useState<BallQuality>('good');

  // Evaluate matching rule dynamically in sandbox
  const simulatedMatch = useMemo(() => {
    const activeRules = [...rules].filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

    for (const rule of activeRules) {
      const colorMatches = rule.color === 'any' || rule.color === testColor;
      const diameterMatches = testDiameter >= rule.minDiameterMm && testDiameter <= rule.maxDiameterMm;
      const qualityMatches = rule.quality === 'any' || rule.quality === testQuality;
      const weightMatches = (!rule.minWeightG || testWeight >= rule.minWeightG) &&
                            (!rule.maxWeightG || testWeight <= rule.maxWeightG);

      if (colorMatches && diameterMatches && qualityMatches && weightMatches) {
        const container = containers.find(c => c.id === rule.targetContainerId) || containers[0];
        return { rule, container, isFallback: false };
      }
    }

    const fallbackContainer = containers.find(c => c.id === 'container_4') || containers[0];
    const fallbackRule = rules.find(r => r.id === 'rule_reject') || rules[0];
    return { rule: fallbackRule, container: fallbackContainer, isFallback: true };
  }, [rules, containers, testColor, testDiameter, testWeight, testQuality]);

  const handleToggleRule = async (ruleId: string) => {
    const updated = rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r);
    await onUpdateRules(updated);
  };

  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rules.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newRules = [...rules];
    const temp = newRules[index];
    newRules[index] = newRules[targetIndex];
    newRules[targetIndex] = temp;

    newRules.forEach((r, idx) => {
      r.priority = idx + 1;
    });

    await onUpdateRules(newRules);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Soll diese Sortierregel wirklich entfernt werden?')) {
      const filtered = rules.filter(r => r.id !== ruleId);
      filtered.forEach((r, idx) => { r.priority = idx + 1; });
      await onUpdateRules(filtered);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    let updated: SortingRule[];
    if (isCreating) {
      updated = [...rules, { ...editingRule, id: 'rule_' + Date.now(), priority: rules.length + 1 }];
    } else {
      updated = rules.map(r => r.id === editingRule.id ? editingRule : r);
    }

    await onUpdateRules(updated);
    setEditingRule(null);
    setIsCreating(false);
  };

  const applyPreset = async (presetType: 'ittf' | 'two_colors' | 'strict_defects') => {
    let presetRules: SortingRule[] = [];

    if (presetType === 'ittf') {
      presetRules = [
        {
          id: 'rule_star',
          name: '3-Sterne Wettkampf (ITTF: 40.0 ±0.15mm, 2.70 ±0.05g)',
          enabled: true,
          targetContainerId: 'container_3',
          color: 'white',
          minDiameterMm: 39.85,
          maxDiameterMm: 40.15,
          minWeightG: 2.65,
          maxWeightG: 2.75,
          quality: 'good',
          priority: 1
        },
        {
          id: 'rule_white',
          name: 'Weiße Standardbälle (Training)',
          enabled: true,
          targetContainerId: 'container_1',
          color: 'white',
          minDiameterMm: 39.40,
          maxDiameterMm: 40.60,
          quality: 'any',
          priority: 2
        },
        {
          id: 'rule_orange',
          name: 'Orange Bälle',
          enabled: true,
          targetContainerId: 'container_2',
          color: 'orange',
          minDiameterMm: 39.30,
          maxDiameterMm: 40.70,
          quality: 'any',
          priority: 3
        },
        {
          id: 'rule_reject',
          name: 'Ausschuss (Abweichung / Delle)',
          enabled: true,
          targetContainerId: 'container_4',
          color: 'any',
          minDiameterMm: 0,
          maxDiameterMm: 99,
          quality: 'damaged',
          priority: 4
        }
      ];
    } else if (presetType === 'two_colors') {
      presetRules = [
        {
          id: 'rule_orange',
          name: 'Alle orangefarbenen Bälle',
          enabled: true,
          targetContainerId: 'container_2',
          color: 'orange',
          minDiameterMm: 38.0,
          maxDiameterMm: 42.0,
          quality: 'any',
          priority: 1
        },
        {
          id: 'rule_white',
          name: 'Alle weißen Bälle',
          enabled: true,
          targetContainerId: 'container_1',
          color: 'white',
          minDiameterMm: 38.0,
          maxDiameterMm: 42.0,
          quality: 'any',
          priority: 2
        },
        {
          id: 'rule_reject',
          name: 'Ausschuss',
          enabled: true,
          targetContainerId: 'container_4',
          color: 'any',
          minDiameterMm: 0,
          maxDiameterMm: 99,
          quality: 'damaged',
          priority: 3
        }
      ];
    } else if (presetType === 'strict_defects') {
      presetRules = [
        {
          id: 'rule_defect_fast',
          name: 'Sofort-Ausschuss: Delle oder Untermaß (<39.4mm)',
          enabled: true,
          targetContainerId: 'container_4',
          color: 'any',
          minDiameterMm: 0,
          maxDiameterMm: 39.39,
          quality: 'any',
          priority: 1
        },
        {
          id: 'rule_star',
          name: 'Geprüfte Bälle Güteklasse A',
          enabled: true,
          targetContainerId: 'container_3',
          color: 'any',
          minDiameterMm: 39.80,
          maxDiameterMm: 40.20,
          quality: 'good',
          priority: 2
        },
        {
          id: 'rule_training',
          name: 'Güteklasse B (Restliche intakte)',
          enabled: true,
          targetContainerId: 'container_1',
          color: 'any',
          minDiameterMm: 39.40,
          maxDiameterMm: 40.60,
          quality: 'training',
          priority: 3
        }
      ];
    }

    await onUpdateRules(presetRules);
  };

  const openNewRuleModal = () => {
    setEditingRule({
      id: '',
      name: 'Neue Sortierregel',
      enabled: true,
      targetContainerId: containers[0]?.id || 'container_1',
      color: 'white',
      minDiameterMm: 39.5,
      maxDiameterMm: 40.5,
      minWeightG: 2.65,
      maxWeightG: 2.75,
      quality: 'any',
      priority: rules.length + 1
    });
    setIsCreating(true);
  };

  return (
    <div className="space-y-5">
      {/* 1. Rule Presets Banner */}
      <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">Vorkonfigurierte Regelsätze (Presets)</h3>
            <p className="text-[11px] text-slate-500">Schnelle Auswahl typischer NwT-Sortieraufgaben</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => applyPreset('ittf')}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
          >
            ITTF 3-Sterne Turnier
          </button>
          <button
            onClick={() => applyPreset('two_colors')}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
          >
            Farb-Sortierung (Weiß / Orange)
          </button>
          <button
            onClick={() => applyPreset('strict_defects')}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
          >
            Strenge Ausschuss-Prüfung
          </button>
        </div>
      </div>

      {/* 2. Interactive Live Rule Test Sandbox */}
      <div className="bg-white rounded-xl border border-blue-200/80 shadow-2xs p-4 bg-gradient-to-br from-white to-blue-50/20 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-blue-600 text-white text-[10px] font-bold uppercase">
              Live-Simulator
            </span>
            <h3 className="text-xs font-bold text-slate-900">Regel-Testlabor: Welcher Behälter wird angesteuert?</h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Simuliere Messwerte direkt im Browser
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Test Color */}
          <div>
            <label className="block text-slate-500 text-[10px] font-semibold mb-1">Farbe</label>
            <select
              value={testColor}
              onChange={e => setTestColor(e.target.value as BallColor)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium"
            >
              <option value="white">Weiß</option>
              <option value="orange">Orange</option>
            </select>
          </div>

          {/* Test Diameter */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-500 text-[10px] font-semibold">Durchmesser (mm)</label>
              <span className="font-mono font-bold text-slate-800">{testDiameter} mm</span>
            </div>
            <input
              type="range"
              min="38.5"
              max="41.5"
              step="0.05"
              value={testDiameter}
              onChange={e => setTestDiameter(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Test Weight */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-500 text-[10px] font-semibold">Gewicht (Gramm)</label>
              <span className="font-mono font-bold text-slate-800">{testWeight} g</span>
            </div>
            <input
              type="range"
              min="2.4"
              max="3.0"
              step="0.01"
              value={testWeight}
              onChange={e => setTestWeight(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Test Quality */}
          <div>
            <label className="block text-slate-500 text-[10px] font-semibold mb-1">Oberfläche / Güte</label>
            <select
              value={testQuality}
              onChange={e => setTestQuality(e.target.value as BallQuality)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium"
            >
              <option value="good">Makellos / 3-Sterne</option>
              <option value="training">Training / Leicht gebraucht</option>
              <option value="damaged">Beschädigt / Delle</option>
            </select>
          </div>
        </div>

        {/* Evaluation Output Banner */}
        <div className="mt-2 p-3 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div 
              className="w-4 h-4 rounded-full border-2 border-white shrink-0" 
              style={{ backgroundColor: simulatedMatch.container.colorHex }} 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100">
                  Ergebnis: {simulatedMatch.container.name}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Servo: {simulatedMatch.container.servoAngle}°
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Angewendete Regel: #{simulatedMatch.rule?.priority || 0} ({simulatedMatch.rule?.name})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold self-start sm:self-auto">
            <CheckCircle2 className="w-4 h-4" />
            <span>Kriterien passen</span>
          </div>
        </div>
      </div>

      {/* 3. Main Rules Management List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Filter className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Aktive Sortierregeln (Prioritätskette)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Der ESP32 gleicht den Sensorwert von oben nach unten ab. Die erste zutreffende Regel schaltet den Servowinkel.
            </p>
          </div>

          <button
            onClick={openNewRuleModal}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Regel hinzufügen</span>
          </button>
        </div>

        {/* Rules Table / Cards */}
        <div className="space-y-2.5">
          {rules.map((rule, index) => {
            const targetContainer = containers.find(c => c.id === rule.targetContainerId);

            return (
              <div
                key={rule.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                  rule.enabled
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/60 opacity-60'
                }`}
              >
                {/* Left: Priority & Name & Conditions */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center justify-center">
                    <button
                      onClick={() => handleMovePriority(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5"
                      title="Priorität erhöhen"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      #{index + 1}
                    </span>
                    <button
                      onClick={() => handleMovePriority(index, 'down')}
                      disabled={index === rules.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5"
                      title="Priorität verringern"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{rule.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        rule.enabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {rule.enabled ? 'Aktiv' : 'Deaktiviert'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-slate-600">
                      {/* Color criteria */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-medium">Farbe:</span>
                        <span className="font-semibold capitalize">
                          {rule.color === 'white' ? 'Weiß' : rule.color === 'orange' ? 'Orange' : 'Jede Farbe'}
                        </span>
                      </div>

                      <span className="text-slate-300">•</span>

                      {/* Diameter criteria */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-medium">Durchmesser:</span>
                        <span className="font-mono font-semibold">
                          {rule.minDiameterMm} – {rule.maxDiameterMm} mm
                        </span>
                      </div>

                      {/* Weight criteria if specified */}
                      {rule.minWeightG && rule.maxWeightG && (
                        <>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium">Gewicht:</span>
                            <span className="font-mono font-semibold">
                              {rule.minWeightG} – {rule.maxWeightG} g
                            </span>
                          </div>
                        </>
                      )}

                      <span className="text-slate-300">•</span>

                      {/* Quality criteria */}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 font-medium">Qualität:</span>
                        <span className="font-semibold capitalize">
                          {rule.quality === 'good' ? '3-Sterne' : rule.quality === 'damaged' ? 'Ausschuss' : 'Alle'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Target Container & Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Target Container Pill */}
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: targetContainer?.colorHex || '#94a3b8' }}
                    />
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block leading-none">Zielbehälter</span>
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        {targetContainer?.name || 'Unbekannt'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleRule(rule.id)}
                      className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        rule.enabled 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={rule.enabled ? 'Regel deaktivieren' : 'Regel aktivieren'}
                    >
                      <Check className={`w-3.5 h-3.5 ${rule.enabled ? 'opacity-100' : 'opacity-40'}`} />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setIsCreating(false);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Regel bearbeiten"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors"
                      title="Regel löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit / Create Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {isCreating ? 'Neue Sortierregel anlegen' : 'Sortierregel bearbeiten'}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Regelname</label>
                <input
                  type="text"
                  required
                  value={editingRule.name}
                  onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Farbe</label>
                  <select
                    value={editingRule.color}
                    onChange={e => setEditingRule({ ...editingRule, color: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs bg-white"
                  >
                    <option value="white">Weiß (Standard/Wettkampf)</option>
                    <option value="orange">Orange (Training)</option>
                    <option value="any">Alle Farben</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Qualitätskriterium</label>
                  <select
                    value={editingRule.quality}
                    onChange={e => setEditingRule({ ...editingRule, quality: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs bg-white"
                  >
                    <option value="any">Egal / Beliebig</option>
                    <option value="good">Makellos / 3-Sterne</option>
                    <option value="training">Training</option>
                    <option value="damaged">Beschädigt / Delle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min. Durchmesser (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editingRule.minDiameterMm}
                    onChange={e => setEditingRule({ ...editingRule, minDiameterMm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max. Durchmesser (mm)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editingRule.maxDiameterMm}
                    onChange={e => setEditingRule({ ...editingRule, maxDiameterMm: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min. Gewicht (Gramm, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="z.B. 2.65"
                    value={editingRule.minWeightG || ''}
                    onChange={e => setEditingRule({ ...editingRule, minWeightG: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max. Gewicht (Gramm, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="z.B. 2.75"
                    value={editingRule.maxWeightG || ''}
                    onChange={e => setEditingRule({ ...editingRule, maxWeightG: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Zielbehälter (Weichenstellung)</label>
                <select
                  value={editingRule.targetContainerId}
                  onChange={e => setEditingRule({ ...editingRule, targetContainerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 text-slate-800 text-xs bg-white font-medium"
                >
                  {containers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Servowinkel: {c.servoAngle}°)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
