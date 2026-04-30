"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEdit, FaTrash, FaStar, FaRegStar, FaEye } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloorplanManager({ restaurantId, token, onFloorplanSelect }) {
  const [floorplans, setFloorplans] = useState([]);
  const [defaultFloorplanId, setDefaultFloorplanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFloorplanName, setNewFloorplanName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedFloorplan, setSelectedFloorplan] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const router = useRouter();

  // Fetch floorplans
  const fetchFloorplans = async () => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/floorplans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFloorplans(data.floorplans || []);
        setDefaultFloorplanId(data.defaultFloorplanId);
        
        // Set selected floorplan to default if none selected
        if (!selectedFloorplan && data.defaultFloorplanId) {
          const defaultFloorplan = data.floorplans?.find(fp => fp._id === data.defaultFloorplanId);
          if (defaultFloorplan) {
            setSelectedFloorplan(defaultFloorplan);
            onFloorplanSelect?.(defaultFloorplan);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching floorplans:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (restaurantId && token) {
      fetchFloorplans();
    }
  }, [restaurantId, token]);

  // Create new floorplan
  const createFloorplan = async () => {
    if (!newFloorplanName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/floorplans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFloorplanName.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchFloorplans(); // Refresh list
        setShowCreateModal(false);
        setNewFloorplanName('');
        
        // Navigate to edit the new floorplan
        const restaurantData = {
          id: restaurantId,
          floorplanId: data.floorplan._id
        };
        localStorage.setItem("restaurantData", JSON.stringify(restaurantData));
        localStorage.setItem("currentFloorplanName", newFloorplanName.trim());
        router.push(`/floorplan/edit/${data.floorplan._id}`);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create floorplan');
      }
    } catch (error) {
      console.error('Error creating floorplan:', error);
      alert('Failed to create floorplan');
    } finally {
      setCreating(false);
    }
  };

  // Set floorplan as default
  const setAsDefault = async (floorplanId) => {
    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/floorplans/${floorplanId}/set-default`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFloorplans(); // Refresh list
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to set as default');
      }
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Failed to set as default');
    }
  };

  // Delete floorplan
  const deleteFloorplan = async (floorplanId, floorplanName) => {
    if (!confirm(`Are you sure you want to delete "${floorplanName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/restaurants/${restaurantId}/floorplans/${floorplanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchFloorplans(); // Refresh list
        
        // If deleted floorplan was selected, select the default one
        if (selectedFloorplan?._id === floorplanId) {
          const defaultFloorplan = floorplans.find(fp => fp._id === defaultFloorplanId);
          if (defaultFloorplan) {
            setSelectedFloorplan(defaultFloorplan);
            onFloorplanSelect?.(defaultFloorplan);
          }
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete floorplan');
      }
    } catch (error) {
      console.error('Error deleting floorplan:', error);
      alert('Failed to delete floorplan');
    }
  };

  // Select floorplan
  const selectFloorplan = (floorplan) => {
    setSelectedFloorplan(floorplan);
    onFloorplanSelect?.(floorplan);
  };

  // Rename floorplan
  const startRename = (floorplan, e) => {
    e.stopPropagation();
    setRenamingId(floorplan._id);
    setRenameValue(floorplan.name);
  };

  const saveRename = async (floorplanId, e) => {
    e?.stopPropagation();
    if (!renameValue.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/floorplans/${floorplanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: renameValue.trim() })
      });
      if (res.ok) {
        localStorage.setItem('currentFloorplanName', renameValue.trim());
        await fetchFloorplans();
      }
    } catch (err) {
      console.error('Rename failed:', err);
    } finally {
      setRenaming(false);
      setRenamingId(null);
    }
  };

  // Edit floorplan
  const editFloorplan = (floorplanId) => {
    const floorplan = floorplans.find(fp => fp._id === floorplanId);
    const restaurantData = {
      id: restaurantId,
      floorplanId: floorplanId
    };
    localStorage.setItem("restaurantData", JSON.stringify(restaurantData));
    localStorage.setItem("currentFloorplanName", floorplan?.name || "Restaurant Floor Plan");
    router.push(`/floorplan/edit/${floorplanId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4F18]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#F2F4F7] p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-[#3A2E2B]">Floor Plans</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF4F18] text-white rounded-lg hover:bg-[#FF4F18]/90 transition-all duration-200"
        >
          <FaPlus className="w-4 h-4" />
          New Floor Plan
        </button>
      </div>

      {floorplans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No floor plans yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-[#FF4F18] hover:underline"
          >
            Create your first floor plan
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {floorplans.map((floorplan) => (
            <motion.div
              key={floorplan._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                selectedFloorplan?._id === floorplan._id
                  ? 'border-[#FF4F18] bg-[#FF4F18]/5'
                  : 'border-gray-200 hover:border-[#FF4F18]/50'
              }`}
              onClick={() => selectFloorplan(floorplan)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  {renamingId === floorplan._id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(floorplan._id); if (e.key === 'Escape') setRenamingId(null); }}
                        className="flex-1 px-2 py-1 text-sm border border-[#FF4F18] rounded text-black outline-none"
                      />
                      <button onClick={e => saveRename(floorplan._id, e)} disabled={renaming}
                        className="text-xs px-2 py-1 bg-[#FF4F18] text-white rounded">
                        {renaming ? '...' : 'Save'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setRenamingId(null); }}
                        className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600">✕</button>
                    </div>
                  ) : (
                    <h4 className="font-medium text-[#3A2E2B] flex items-center gap-2 group">
                      {floorplan.name}
                      {floorplan._id === defaultFloorplanId && (
                        <FaStar className="w-4 h-4 text-yellow-500" title="Default floor plan" />
                      )}
                      <button onClick={e => startRename(floorplan, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#FF4F18]"
                        title="Rename">
                        <FaEdit className="w-3 h-3" />
                      </button>
                    </h4>
                  )}
                  <p className="text-sm text-gray-500">
                    {floorplan.data?.objects?.length || 0} objects
                  </p>
                </div>
              </div>

              {floorplan.screenshotUrl && (
                <div className="mb-3">
                  <img
                    src={floorplan.screenshotUrl}
                    alt={`${floorplan.name} preview`}
                    className="w-full h-24 object-cover rounded border"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      editFloorplan(floorplan._id);
                    }}
                    className="p-2 text-gray-600 hover:text-[#FF4F18] hover:bg-[#FF4F18]/10 rounded transition-colors"
                    title="Edit floor plan"
                  >
                    <FaEdit className="w-4 h-4" />
                  </button>
                  
                  {floorplan._id !== defaultFloorplanId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsDefault(floorplan._id);
                      }}
                      className="p-2 text-gray-600 hover:text-yellow-500 hover:bg-yellow-50 rounded transition-colors"
                      title="Set as default"
                    >
                      <FaRegStar className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {floorplans.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFloorplan(floorplan._id, floorplan.name);
                    }}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Delete floor plan"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-[#3A2E2B] mb-4">
                Create New Floor Plan
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Plan Name
                </label>
                <input
                  type="text"
                  value={newFloorplanName}
                  onChange={(e) => setNewFloorplanName(e.target.value)}
                  placeholder="e.g., Main Dining Area, Private Room, Patio..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF4F18] focus:border-transparent text-black placeholder-gray-400"
                  maxLength={50}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewFloorplanName('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createFloorplan}
                  disabled={!newFloorplanName.trim() || creating}
                  className="flex-1 px-4 py-2 bg-[#FF4F18] text-white rounded-lg hover:bg-[#FF4F18]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
