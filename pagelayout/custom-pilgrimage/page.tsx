"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
// Ensure you have these icons installed: npm install @heroicons/react
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeTransparentIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";

interface CustomPilgrimage {
  id: number;
  title: string;
  subtitle1?: string;
  subtitle2?: string;
  subtitle3?: string;
  subtitle4?: string;
  isActive: boolean;
  heroImage?: string;
}

// Status Messages Map (for modals)
const STATUS_MESSAGES = {
  success: { title: "Success 🎉", iconColor: "text-green-500" },
  error: { title: "Error ❌", iconColor: "text-red-500" },
  warning: { title: "Warning ⚠️", iconColor: "text-yellow-400" }, 
} as const;


export default function CustomPilgrimageDashboard() {
  const [data, setData] = useState<CustomPilgrimage[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle1, setSubtitle1] = useState("");
  const [subtitle2, setSubtitle2] = useState("");
  const [subtitle3, setSubtitle3] = useState("");
  const [subtitle4, setSubtitle4] = useState("");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // State for displaying existing image during edit
  const [currentHeroImage, setCurrentHeroImage] = useState<string | undefined>(undefined);

  // --- Loading States ---
  const [isProcessing, setIsProcessing] = useState(false); // For form submission/actions (loading on buttons)
  const [isLoading, setIsLoading] = useState(true); // For initial data fetch/refresh

  // Use keys to force re-render and clear file inputs
  const [heroKey, setHeroKey] = useState(0);

  // --- Modal state ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">("success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // --- useRef for form scrolling (optional) ---
  const formRef = useRef<HTMLFormElement>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  // ✅ Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/custom-pilgrimage", { cache: "no-store" });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.details || result.error || "Failed to fetch data");
      }
      
      setData(result);
    } catch (err) {
      const error = err as Error;
      console.error("❌ Fetch error:", error.message);
      showModal(`⚠️ Failed to fetch data: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
      fetchData();
  }, []);

  // ✅ Reset form
  const resetForm = () => {
    setTitle("");
    setSubtitle1("");
    setSubtitle2("");
    setSubtitle3("");
    setSubtitle4("");
    setHeroFile(null);
    setIsActive(true);
    setEditingId(null);
    setCurrentHeroImage(undefined);
    setHeroKey(prev => prev + 1); // Clears file input
  };

  // ✅ Save or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!title.trim() || !subtitle1.trim() || !subtitle2.trim() || !subtitle3.trim() || !subtitle4.trim()) {
      setIsProcessing(false);
      return showModal("⚠️ All Title and Subtitle fields are required", "warning");
    }
    
    const hasNewFile = heroFile && heroFile.size > 0;

    // Validation
    if (!editingId && !hasNewFile) {
        setIsProcessing(false);
        return showModal("⚠️ Image is required for a new entry.", "warning");
    }
    if (editingId && !hasNewFile && !currentHeroImage) {
        setIsProcessing(false);
        return showModal("⚠️ Please upload a new image or ensure one exists for update.", "warning");
    }


    const formData = new FormData();
    formData.append("title", title);
    formData.append("subtitle1", subtitle1);
    formData.append("subtitle2", subtitle2);
    formData.append("subtitle3", subtitle3);
    formData.append("subtitle4", subtitle4);
    formData.append("isActive", String(isActive));
    
    if (editingId) {
      formData.append("id", String(editingId));
    }
    
    if (heroFile) {
      formData.append("heroImage", heroFile);
    }
    
    try {
      // API call to the unified POST endpoint
      const res = await fetch("/api/custom-pilgrimage", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();

      if (!res.ok) {
        // Log the detailed error from the server if available
        throw new Error(result.details || result.error || "Failed to save data");
      }

      showModal(editingId ? "✅ Entry updated!" : "✅ Entry added!", "success");
      resetForm();
      fetchData();
    } catch (err) {
      const error = err as Error;
      console.error("❌ Save error:", error.message);
      showModal(`❌ Failed to save entry: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Edit
  const handleEdit = (entry: CustomPilgrimage) => {
    setEditingId(entry.id);
    setTitle(entry.title);
    setSubtitle1(entry.subtitle1 || "");
    setSubtitle2(entry.subtitle2 || "");
    setSubtitle3(entry.subtitle3 || "");
    setSubtitle4(entry.subtitle4 || "");
    setIsActive(entry.isActive);
    
    setCurrentHeroImage(entry.heroImage);
    
    setHeroFile(null); 
    setHeroKey(prev => prev + 1);

    // Scroll to form after clicking edit
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ Delete
  const confirmDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };
  
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/custom-pilgrimage?id=${deleteId}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.details || result.error || "Failed to delete");
      }
      
      showModal("🗑️ Entry deleted", "success");
      setDeleteId(null);
      fetchData();
    } catch (err) {
      const error = err as Error;
      console.error("❌ Delete error:", error.message);
      showModal(`❌ Failed to delete entry: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };

  // ✅ Toggle active/inactive
  const toggleActive = async (id: number, current: boolean) => {
    if(isProcessing || isLoading) return;
    try {
      setIsProcessing(true);
      const res = await fetch("/api/custom-pilgrimage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.details || result.error || "Failed to toggle");
      }

      showModal("✅ Status updated!", "success");
      fetchData();
    } catch (err) {
      const error = err as Error;
      console.error("❌ Toggle error:", error.message);
      showModal(`⚠️ Could not update status: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const isEditing = !!editingId;
  const isAnyActionDisabled = isProcessing || isLoading;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-8 text-center text-yellow-400 flex items-center justify-center" id="customize">
        <CubeTransparentIcon className="h-8 w-8 mr-2" /> Customize Pilgrimage Dashboard
      </h1>

      {/* --- GLOBAL LOADER (Overlay) --- */}
      {(isProcessing || isLoading) && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
             <p className="mt-4 text-white font-semibold text-lg">{isLoading ? "Loading Data..." : "Processing Request..."}</p>
          </div>
        </div>
      )}
      
      {/* // ----------------------------------------------------------------------------------
      // --- FORM SECTION ---
      // ----------------------------------------------------------------------------------
      */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-gray-900 text-white shadow-2xl rounded-xl p-6 md:p-8 mb-12 border border-gray-700"
        ref={formRef}
      >
        <h2 className="text-xl font-bold text-yellow-400 border-b border-gray-700 pb-2 flex items-center">
            {isEditing ? "Edit Custom Pilgrimage Data" : "Add New Custom Pilgrimage Data"}
            <PlusCircleIcon className="h-5 w-5 ml-2" />
        </h2>

        {/* Title */}
        <input
          type="text"
          placeholder="Main Title (e.g., 'Tailor Your Spiritual Journey')"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500 transition-colors"
          disabled={isProcessing}
          required
        />

        {/* Subtitles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
                type="text"
                placeholder="Subtitle 1 (e.g., Choose your flights)"
                value={subtitle1}
                onChange={(e) => setSubtitle1(e.target.value)}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={isProcessing}
                required
            />
            <input
                type="text"
                placeholder="Subtitle 2 (e.g., Select hotels)"
                value={subtitle2}
                onChange={(e) => setSubtitle2(e.target.value)}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={isProcessing}
                required
            />
            <input
                type="text"
                placeholder="Subtitle 3 (e.g., Set your duration)"
                value={subtitle3}
                onChange={(e) => setSubtitle3(e.target.value)}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={isProcessing}
                required
            />
            <input
                type="text"
                placeholder="Subtitle 4 (e.g., Get a quote)"
                value={subtitle4}
                onChange={(e) => setSubtitle4(e.target.value)}
                className="border border-gray-700 p-3 w-full rounded-lg focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-500"
                disabled={isProcessing}
                required
            />
        </div>
        


        {/* Image Input and Preview */}
        <div className="p-4 border-2  border-yellow-400/50 rounded-xl space-y-4 bg-gray-800">
          <p className="text-sm font-semibold text-yellow-400 flex items-center space-x-2">
            <CubeTransparentIcon className="h-5 w-5"/><span>Hero Image Upload (Will replace existing on update)</span>
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
            className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-black hover:file:bg-yellow-600 transition-colors cursor-pointer text-sm text-gray-300"
            key={heroKey} 
            disabled={isProcessing}
          />
          
          {(currentHeroImage || heroFile) && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">
                  {heroFile ? 'New Image Preview' : 'Current Image'}
                </p>
                <img
                  // Use URL.createObjectURL for new file preview, otherwise use current URL
                  src={heroFile ? URL.createObjectURL(heroFile) : currentHeroImage}
                  alt="Hero Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-600"
                  onError={(e) => {
                    // Fallback in case of broken image URL
                    e.currentTarget.src = "/placeholder.png";
                    e.currentTarget.onerror = null;
                  }}
                />
                {isEditing && !heroFile && <p className="text-xs text-gray-500 mt-1">Upload a new file to replace the current image.</p>}
              </div>
            )}
        </div>


        {/* Form Actions */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isAnyActionDisabled}
            className="bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
                <span>Processing...</span>
            ) : isEditing ? (
                <><PencilIcon className="h-5 w-5"/><span>Update Data</span></>
            ) : (
                <><CubeTransparentIcon className="h-5 w-5"/><span>Save New Data</span></>
            )}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-600 disabled:opacity-50 transition-colors"
              disabled={isProcessing}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>




      {isLoading && data.length === 0 ? (
          <p className="text-center text-gray-400 p-10 bg-gray-900 rounded-xl border border-gray-700">Loading data...</p>
      ) : data.length === 0 ? (
        <p className="text-center text-gray-400 p-10 bg-gray-900 rounded-xl border border-gray-700">No entries available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((entry) => (
              <div
                key={entry.id}
                className={`bg-gray-900 text-white rounded-xl shadow-xl p-4 flex flex-col transition-shadow  border ${
                    entry.isActive ? "border-yellow-600" : "border-gray-700 opacity-80"
                }`}
              >
                
                {/* Image Display */}
                <div className="h-40 w-full overflow-hidden rounded-lg mb-3">
                  {entry.heroImage ? (
                      <img
                        src={entry.heroImage}
                        alt={entry.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = "/placeholder.png";
                            e.currentTarget.onerror = null;
                        }}
                      />
                  ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">No Hero Image</div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-xl text-yellow-400 line-clamp-2">{entry.title}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        entry.isActive ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {entry.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                </div>
                
                <div className="text-gray-300 text-sm mb-4 space-y-1">
                    <p>1: {entry.subtitle1}</p>
                    <p>2: {entry.subtitle2}</p>
                    <p>3: {entry.subtitle3}</p>
                    <p>4: {entry.subtitle4}</p>
                </div>
                
                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-auto pt-3 border-t border-gray-800">
                  <Link href="#customize" passHref legacyBehavior>
                    <button
                      onClick={() => handleEdit(entry)}
                      className="flex-1 bg-yellow-500 text-black px-3 py-1.5 rounded-lg hover:bg-yellow-600 disabled:opacity-50 text-sm font-semibold flex items-center justify-center transition-colors min-w-[80px]"
                      disabled={isAnyActionDisabled}
                    >
                      <PencilIcon className="h-4 w-4 mr-1"/> Edit
                    </button>
                  </Link>
                  
                  <button
                    onClick={() => toggleActive(entry.id, entry.isActive)}
                    className={`flex-1 px-3 py-1.5 rounded-lg disabled:opacity-50 text-sm font-semibold flex items-center justify-center transition-colors min-w-[80px] ${
                      entry.isActive
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                    disabled={isAnyActionDisabled}
                  >
                    {entry.isActive ? <CheckCircleIcon className="h-4 w-4 mr-1"/> : <XCircleIcon className="h-4 w-4 mr-1"/>}
                    {entry.isActive ? "Active" : "Toggle"}
                  </button>

                  <button
                    onClick={() => confirmDelete(entry.id)}
                    className="w-full bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-semibold flex items-center justify-center transition-colors"
                    disabled={isAnyActionDisabled}
                  >
                    <TrashIcon className="h-4 w-4 mr-1"/> Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* // ----------------------------------------------------------------------------------
      // --- MODALS SECTION ---
      // ----------------------------------------------------------------------------------
      */}
      {/* General Message Modal */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !isProcessing && setIsModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-xl p-6 text-center shadow-2xl bg-gray-800 text-white border border-gray-700">
              <Dialog.Title
                className={`text-2xl font-extrabold ${STATUS_MESSAGES[modalType].iconColor}`}
              >
                {STATUS_MESSAGES[modalType].title}
              </Dialog.Title>
              <p className="mt-4 text-lg text-gray-300">{modalMessage}</p>
              <div className="mt-6">
                <button
                  className="bg-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-600 text-white transition-colors"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !isProcessing && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-sm rounded-xl p-6 text-center shadow-2xl bg-gray-800 text-white border border-gray-700">
              <Dialog.Title className="text-xl font-bold text-red-500">
                Confirm Deletion
              </Dialog.Title>
              <p className="mt-2 text-gray-300">
                Are you absolutely sure you want to delete this entry?
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <button
                  className="bg-gray-700 px-5 py-2 rounded-lg font-semibold hover:bg-gray-600 text-white transition-colors"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}