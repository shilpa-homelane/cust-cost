import { useState, useEffect } from 'react';
import { Shield, BookOpen, CheckCircle, AlertTriangle, Edit2, X, RefreshCw } from 'lucide-react';

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
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureItem | null>(null);
  
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationCount, setCalibrationCount] = useState(0);
  const [confidenceBuffer, setConfidenceBuffer] = useState(10.0);
  const [version, setVersion] = useState("v1.0");
  const [calibrationNotes, setCalibrationNotes] = useState("");

  const isWritable = role === 'D2M Analyst' || role === 'Admin';

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/features");
      const data = await res.json();
      if (res.ok) {
        setFeatures(data);
      } else {
        console.error("Failed to load features");
      }
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
    setCalibrationNotes(feature.calibration_notes || "");
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeature || !isWritable) return;

    try {
      const payload = {
        is_calibrated: isCalibrated,
        calibration_count: calibrationCount,
        confidence_buffer: confidenceBuffer,
        version: version,
        calibration_notes: calibrationNotes
      };

      const res = await fetch(`/api/v1/features/${editingFeature.feature_type}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": role
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update feature");
      }

      alert("Feature cost model updated successfully!");
      setIsModalOpen(false);
      fetchFeatures();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update feature");
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-white flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>D2M Cost Feature Library</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Calibrate premium cost models and manage confidence buffer penalties.</p>
        </div>
        
        {/* Role Warning Banner */}
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium ${
          isWritable ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <Shield className="w-4 h-4" />
          <span>{isWritable ? 'D2M Costing Analyst Mode (Write Access)' : 'Viewer Mode (Read-Only Access)'}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-8 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading feature library...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Section */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                      {feature.name}
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-600 font-mono px-2 py-0.5 rounded">
                      {feature.version}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 leading-relaxed mb-4 min-h-[40px]">
                    {feature.description}
                  </p>

                  {/* Calibration Metric */}
                  <div className="flex items-center space-x-4 mb-4">
                    {feature.is_calibrated ? (
                      <span className="flex items-center space-x-1 text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Calibrated ({feature.calibration_count}+ projects)</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Experimental ({feature.confidence_buffer}% Penalty)</span>
                      </span>
                    )}
                  </div>

                  {/* Calibration notes preview */}
                  <div className="text-xs bg-gray-50 border border-gray-100 p-3 rounded-lg text-gray-500 italic">
                    {feature.calibration_notes || 'No calibration records submitted yet.'}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex justify-between items-center">
                  <span className="text-xxs text-gray-400">
                    Updated: {new Date(feature.last_updated).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => openEditModal(feature)}
                    className={`flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      isWritable 
                        ? 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 bg-white shadow-sm' 
                        : 'text-gray-500 border-gray-200 bg-gray-100 cursor-not-allowed'
                    }`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isWritable ? 'Calibrate' : 'View Config'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Calibration Modal */}
      {isModalOpen && editingFeature && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-950">
                  Calibrate Cost Model: {editingFeature.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">Configure pricing safety parameters for the costing engine.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdate} className="p-6 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Calibration Status</label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={isCalibrated} 
                      onChange={() => {
                        setIsCalibrated(true);
                        setConfidenceBuffer(0.0);
                      }} 
                      disabled={!isWritable}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Calibrated (0% Confidence Buffer)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={!isCalibrated} 
                      onChange={() => {
                        setIsCalibrated(false);
                        setConfidenceBuffer(10.0);
                      }} 
                      disabled={!isWritable}
                      className="text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-800">Experimental (Confidence Buffer Penalty)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Calibration Project Count</label>
                  <input 
                    type="number" 
                    value={calibrationCount} 
                    onChange={(e) => setCalibrationCount(parseInt(e.target.value) || 0)} 
                    disabled={!isWritable}
                    min="0"
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Confidence Buffer (%)</label>
                  <input 
                    type="number" 
                    value={confidenceBuffer} 
                    onChange={(e) => setConfidenceBuffer(parseFloat(e.target.value) || 0.0)} 
                    disabled={!isWritable}
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Model Version</label>
                <input 
                  type="text" 
                  value={version} 
                  onChange={(e) => setVersion(e.target.value)} 
                  disabled={!isWritable}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Calibration Notes / Reference Projects</label>
                <textarea 
                  value={calibrationNotes} 
                  onChange={(e) => setCalibrationNotes(e.target.value)} 
                  disabled={!isWritable}
                  rows={3}
                  placeholder="Record calibration audits, e.g. 'Calibrated against projects #209, #314, #120. Approved by D2M lead.'"
                  className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {isWritable ? (
                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-amber-600 font-semibold bg-amber-50 p-2.5 rounded-lg">
                  Read-only view. Select D2M Analyst role to modify calibration configurations.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
