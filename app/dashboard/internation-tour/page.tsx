"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface SliderImage {
  id: number;
  url: string;
  publicId: string;
}

interface Tour {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  backgroundUrl?: string;
  sliderImages: SliderImage[];
}

export default function InternationalTourDashboard() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageType, setImageType] = useState<"background" | "slider">("background");
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [sliderFiles, setSliderFiles] = useState<File[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Use keys to force re-render and clear file inputs
  const [backgroundKey, setBackgroundKey] = useState(0);
  const [sliderKey, setSliderKey] = useState(0);

  // --- Modal state ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">(
    "success"
  );

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  // ✅ Fetch tours
  const fetchTours = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/international-tour", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch tours");
      const data = await res.json();
      setTours(data);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      showModal("⚠️ Failed to fetch tours", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, []);

  // ✅ Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageType("background");
    setBackgroundFile(null);
    setSliderFiles([]);
    setIsActive(true);
    setEditingId(null);
    // Increment keys to force re-render and clear file inputs
    setBackgroundKey(prev => prev + 1);
    setSliderKey(prev => prev + 1);
  };

  // ✅ Save or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // 👈 Set loading to true at the very beginning

    if (!title.trim() || !description.trim()) {
      setLoading(false); // 👈 Set loading to false if validation fails
      return showModal("⚠️ Title and Description are required", "warning");
    }
    
    // Validation for new tour
    if (!editingId) {
        if (imageType === "background" && !backgroundFile) {
            setLoading(false); // 👈 Set loading to false if validation fails
            return showModal("⚠️ Please upload a background image for a new tour", "warning");
        }
        if (imageType === "slider" && sliderFiles.length === 0) {
            setLoading(false); // 👈 Set loading to false if validation fails
            return showModal("⚠️ Please upload at least one slider image for a new tour", "warning");
        }
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("isActive", String(isActive));
    
    // Add ID if editing
    if (editingId) {
      formData.append("id", String(editingId));
    }
    
    // Append files based on imageType
    if (imageType === "background" && backgroundFile) {
      formData.append("backgroundImage", backgroundFile);
    }
    if (imageType === "slider" && sliderFiles.length > 0) {
      sliderFiles.forEach((file) => formData.append("sliderImages", file));
    }
    
    // --- New Logic: Delete old image for same category (if any)
    if (!editingId && imageType === "background" && backgroundFile) {
        const existingBackgroundTour = tours.find(t => t.backgroundUrl);
        if (existingBackgroundTour) {
            // Delete the old tour with the background image
            await fetch(`/api/international-tour?id=${existingBackgroundTour.id}`, { method: "DELETE" });
        }
    }
    
    try {
      const res = await fetch("/api/international-tour", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showModal(editingId ? "✅ Tour updated!" : "✅ Tour added!", "success");
      resetForm();
      fetchTours();
    } catch (err) {
      console.error("❌ Save error:", err);
      showModal("❌ Failed to save tour", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit
  const handleEdit = (tour: Tour) => {
    setEditingId(tour.id);
    setTitle(tour.title);
    setDescription(tour.description);
    setIsActive(tour.isActive);
    if (tour.backgroundUrl) {
      setImageType("background");
    } else if (tour.sliderImages.length > 0) {
      setImageType("slider");
    }
    // Clear file inputs for new selection
    setBackgroundFile(null); 
    setSliderFiles([]);
  };

  // ✅ Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/international-tour?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      showModal("🗑️ Tour deleted", "success");
      setDeleteId(null);
      fetchTours();
    } catch (err) {
      console.error("❌ Delete error:", err);
      showModal("❌ Failed to delete tour", "error");
    } finally {
      setDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // ✅ Toggle active/inactive
  const toggleActive = async (id: number, current: boolean) => {
    try {
      const res = await fetch("/api/international-tour", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      showModal("✅ Status updated!", "success");
      fetchTours();
    } catch (err) {
      console.error("❌ Toggle error:", err);
      showModal("⚠️ Could not update status", "error");
    }
  };

  // Filter tours by image type
  const backgroundTours = tours.filter(tour => tour.backgroundUrl);
  const sliderTours = tours.filter(tour => tour.sliderImages.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🌍 International Tours</h1>

      {/* --- LOADER --- */}
      {fetching && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* --- FORM --- */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10"
      >
        <input
          type="text"
          placeholder="Tour Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none"
        />

        {/* This select is now disabled if editing */}
        <select
          value={imageType}
          onChange={(e) => setImageType(e.target.value as "background" | "slider")}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black text-white"
          disabled={!!editingId || loading} // 👈 Disable the select when editing or loading
        >
          <option value="background">Background Image</option>
          <option value="slider">Slider Images</option>
        </select>

        {imageType === "background" && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBackgroundFile(e.target.files?.[0] || null)}
            className="border border-gray-700 p-2 w-full rounded bg-black text-white"
            key={backgroundKey} 
            disabled={loading} // 👈 Disable input when loading
          />
        )}

        {imageType === "slider" && (
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) =>
              setSliderFiles(e.target.files ? Array.from(e.target.files) : [])
            }
            className="border border-gray-700 p-2 w-full rounded bg-black text-white"
            key={sliderKey}
            disabled={loading} // 👈 Disable input when loading
          />
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : editingId ? "Update Tour" : "Save Tour"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              disabled={loading} // 👈 Disable cancel when loading
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* --- LIST --- */}
      {!fetching && tours.length === 0 ? (
        <p className="text-center text-gray-500">No tours available.</p>
      ) : (
        <>
          {backgroundTours.length > 0 && (
            <div className="mb-10">
              <h1 className="text-2xl font-bold mb-4 text-center">Background Image Tours</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {backgroundTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
                  >
                    <h2 className="font-bold text-lg">{tour.title}</h2>
                    <p className="text-gray-300 mb-2 line-clamp-3">{tour.description}</p>
                    <img
                      src={tour.backgroundUrl}
                      alt={tour.title}
                      className="w-full h-56 object-cover rounded"
                    />
                    <div className="flex justify-between gap-2 mt-4">
                      <button
                        onClick={() => handleEdit(tour)}
                        className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(tour.id);
                          setIsDeleteOpen(true);
                        }}
                        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => toggleActive(tour.id, tour.isActive)}
                        className={`px-4 py-1 rounded ${
                          tour.isActive
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                      >
                        {tour.isActive ? "Active ✅" : "Inactive ❌"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sliderTours.length > 0 && (
            <div>
              <h1 className="text-2xl font-bold mb-4 text-center">Slider Image Tours</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sliderTours.map((tour) => (
                  <div
                    key={tour.id}
                    className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
                  >
                    <h2 className="font-bold text-lg">{tour.title}</h2>
                    <p className="text-gray-300 mb-2 line-clamp-3">{tour.description}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {tour.sliderImages.slice(0, 4).map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt=""
                          className="h-28 w-full object-cover rounded"
                        />
                      ))}
                    </div>
                    <div className="flex justify-between gap-2 mt-4">
                      <button
                        onClick={() => handleEdit(tour)}
                        className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteId(tour.id);
                          setIsDeleteOpen(true);
                        }}
                        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => toggleActive(tour.id, tour.isActive)}
                        className={`px-4 py-1 rounded ${
                          tour.isActive
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                      >
                        {tour.isActive ? "Active ✅" : "Inactive ❌"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- MODALS --- */}
      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsModalOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title
                className={`text-lg font-bold ${
                  modalType === "success"
                    ? "text-green-600"
                    : modalType === "error"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              >
                {modalType === "success"
                  ? "Success 🎉"
                  : modalType === "error"
                  ? "Error ❌"
                  : "Warning ⚠️"}
              </Dialog.Title>
              <p className="mt-2">{modalMessage}</p>
              <div className="mt-4">
                <button
                  className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                  onClick={() => setIsModalOpen(false)}
                >
                  OK
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isDeleteOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !deleting && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title className="text-lg font-bold text-red-600">
                Confirm Delete
              </Dialog.Title>
              <p className="mt-2">Are you sure you want to delete this tour?</p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}