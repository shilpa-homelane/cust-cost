import { useState, useEffect } from 'react';
import { Shield, BookOpen, CheckCircle, AlertTriangle, Edit2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { SkeletonCard } from './ui/Skeleton';
import { useToast } from './ui/Toast';

interface FeatureItem {
  id: number;
  feature_type: string;
  name: string;
  description: string;
  is_calibrated: boolean;
  calibration_count: number;
  confidence_buffer: number;
  version: string;
  calibration_notes: string;
  last_updated: string;
}

export function D2MFeatureLibrary({ role }: { role: string }) {
  const { showToast } = useToast();
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureItem | null>(null);

  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationCount, setCalibrationCount] = useState(0);
  const [confidenceBuffer, setConfidenceBuffer] = useState(10.0);
  const [version, setVersion] = useState('v1.0');
  const [calibrationNotes, setCalibrationNotes] = useState('');

  const isWritable = role === 'D2M Analyst' || role === 'Admin';

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/features');
      const data = await res.json();
      if (res.ok) setFeatures(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const openEditModal = (feature: FeatureItem) => {
    setEditingFeature(feature);
    setIsCalibrated(feature.is_calibrated);
    setCalibrationCount(feature.calibration_count);
    setConfidenceBuffer(feature.confidence_buffer);
    setVersion(feature.version);
    setCalibrationNotes(feature.calibration_notes || '');
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature || !isWritable) return;

    try {
      const res = await fetch(`/api/v1/features/${editingFeature.feature_type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
        body: JSON.stringify({
          is_calibrated: isCalibrated,
          calibration_count: calibrationCount,
          confidence_buffer: confidenceBuffer,
          version,
          calibration_notes: calibrationNotes,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update feature');
      }

      showToast('Feature cost model updated.', 'success');
      setIsModalOpen(false);
      fetchFeatures();
    } catch (err: any) {
      showToast(err.message || 'Failed to update feature.', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">D2M Cost Feature Library</h1>
            <p className="text-xs text-slate-500 mt-0.5">Calibrate premium cost models and manage confidence buffer penalties.</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
          isWritable
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <Shield className="w-3.5 h-3.5" />
          {isWritable ? 'Write Access' : 'Read-Only'}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : features.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No features yet</p>
            <p className="text-xs text-slate-400">The D2M feature library is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(feature => (
              <div
                key={feature.id}
                className="bg-white rounded-2xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all flex flex-col overflow-hidden"
              >
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight">{feature.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                      {feature.version}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-3 min-h-[32px]">{feature.description}</p>

                  <div className="mb-3">
                    {feature.is_calibrated ? (
                      <Badge variant="calibrated" icon={<CheckCircle className="w-3 h-3" />}>
                        Calibrated ({feature.calibration_count}+ projects)
                      </Badge>
                    ) : (
                      <Badge variant="experimental" icon={<AlertTriangle className="w-3 h-3" />}>
                        Experimental ({feature.confidence_buffer}% Penalty)
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl text-slate-400 italic leading-relaxed">
                    {feature.calibration_notes || 'No calibration records submitted yet.'}
                  </div>
                </div>

                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">
                    Updated {new Date(feature.last_updated).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => openEditModal(feature)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      isWritable
                        ? 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white shadow-sm'
                        : 'text-slate-400 border-slate-200 bg-slate-100 cursor-not-allowed'
                    }`}
                  >
                    <Edit2 className="w-3 h-3" />
                    {isWritable ? 'Calibrate' : 'View'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calibration Modal */}
      <Modal
        open={isModalOpen && !!editingFeature}
        onClose={() => setIsModalOpen(false)}
        title={`Calibrate: ${editingFeature?.name}`}
        subtitle="Configure pricing safety parameters for the costing engine."
        maxWidth="max-w-lg"
        footer={
          isWritable ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                form="calibrate-form"
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-600 font-medium text-center">
              Read-only view — select D2M Analyst or Admin role to modify calibration.
            </p>
          )
        }
      >
        <form id="calibrate-form" onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Calibration Status</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isCalibrated}
                  onChange={() => { setIsCalibrated(true); setConfidenceBuffer(0.0); }}
                  disabled={!isWritable}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span className="text-sm text-slate-700">Calibrated (0% Buffer)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isCalibrated}
                  onChange={() => { setIsCalibrated(false); setConfidenceBuffer(10.0); }}
                  disabled={!isWritable}
                  className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
                />
                <span className="text-sm text-slate-700">Experimental (Buffer Penalty)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Project Count</label>
              <input
                type="number"
                value={calibrationCount}
                onChange={e => setCalibrationCount(parseInt(e.target.value) || 0)}
                disabled={!isWritable}
                min="0"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Confidence Buffer (%)</label>
              <input
                type="number"
                value={confidenceBuffer}
                onChange={e => setConfidenceBuffer(parseFloat(e.target.value) || 0)}
                disabled={!isWritable}
                min="0"
                max="100"
                step="0.5"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Model Version</label>
            <input
              type="text"
              value={version}
              onChange={e => setVersion(e.target.value)}
              disabled={!isWritable}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Calibration Notes</label>
            <textarea
              value={calibrationNotes}
              onChange={e => setCalibrationNotes(e.target.value)}
              disabled={!isWritable}
              rows={3}
              placeholder="e.g. Calibrated against projects #209, #314, #120. Approved by D2M lead."
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800 resize-none placeholder:text-slate-400"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
