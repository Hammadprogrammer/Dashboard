"use client";
import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { PlayCircleIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

interface VideoItem {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  isActive: boolean;
}

export default function VideoDashboard() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<
    "success" | "error" | "warning"
  >("success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [isVideoViewerOpen, setIsVideoViewerOpen] = useState(false);
  const [urlToView, setUrlToView] = useState<string | null>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/videos");
      
      if (!res.ok) {
         const errorDetail = await res.text().catch(() => "No response body.");
         throw new Error(`Server returned status ${res.status}. **Please check that app/api/videos/route.ts exists and restart the server.**`);
      }
      
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(" Fetch Error:", err);
      showModal(`⚠️ Error fetching videos. Details: ${err instanceof Error ? err.message : 'Unknown'}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) {
      return showModal("Title and Video URL are required.", "warning");
    }
    setIsProcessing(true);
    
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title,
          description: description.trim() || null,
          videoUrl,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));
        throw new Error(errorData.error || "Failed to save video.");
      }
      
      await res.json();
      
      // Update: resetForm() automatically clears editingId, enabling buttons
      showModal(editingId ? " Video updated!" : " Video added!", "success");
      resetForm();
      fetchItems();
    } catch (err) {
      console.error(" Save Error:", err);
      showModal(`⚠️ Error saving video: ${err instanceof Error ? err.message : 'Unknown error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleActive = async (item: VideoItem) => {
    // Disable action if currently editing
    if (editingId) return; 
    
    setIsProcessing(true);
    const newStatus = !item.isActive;
    try {
      const res = await fetch(`/api/videos?id=${item.id}&isActive=${newStatus}`, {
        method: "PATCH", 
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Server returned status ${res.status}` }));
        throw new Error(errorData.error || "Failed to update status.");
      }

      showModal(` Video status updated to ${newStatus ? 'Active' : 'Inactive'}!`, "success");
      fetchItems();
    } catch (err) {
      console.error(" Toggle Status Error:", err);
      showModal(` Error updating status: ${err instanceof Error ? err.message : 'Unknown error'}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleEdit = (item: VideoItem) => {
    // Setting editingId enables the Edit Form and disables other list actions
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description || "");
    setVideoUrl(item.videoUrl);
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const confirmDelete = (id: number) => {
    // Disable action if currently editing
    if (editingId) return; 
    
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/videos?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete video");
      showModal(" Video deleted!", "success");
      setDeleteId(null);
      fetchItems();
    } catch (err) {
      console.error(" Delete Error:", err);
      showModal(" Could not delete video", "error");
    } finally {
      setIsProcessing(false);
      setIsDeleteOpen(false);
    }
  };
  
  const handleViewVideo = (url: string) => {
    setUrlToView(url);
    setIsVideoViewerOpen(true);
  }

  const isAnyActionDisabled = isProcessing || !!editingId; 

  return (
    <div className="p-6 max-w-7xl mx-auto mt-20">
      <h1 className="text-3xl font-bold mb-6 text-center text-yellow-500 flex items-center justify-center" id="video-heading">
        <PlayCircleIcon className="h-8 w-8 mr-2" /> Video Management Dashboard
      </h1>

      {/* --- Loading Spinner/Processing Overlay --- */}
      {(isProcessing || isLoading) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* --- CRUD FORM --- */}
      <form
        onSubmit={handleSubmit}
        ref={formRef}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10"
      >
        <input
          type="text"
          placeholder="Video Title (required)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={isProcessing}
        />
        <input
          type="url"
          placeholder="Video URL (e.g., YouTube embed link)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={isProcessing}
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none"
          disabled={isProcessing}
        />

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50 transition-colors font-semibold"
          >
            {isProcessing ? "Saving..." : editingId ? "Update Video" : "Add New Video"}
          </button>
          {editingId && (
            <button
              type="button"
              // Cancel calls resetForm(), which clears editingId and re-enables list buttons
              onClick={resetForm} 
              disabled={isProcessing}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* --- VIDEO LIST --- */}
      {!isLoading && items.length === 0 ? (
        <p className="text-center text-gray-500">No videos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-gray-900 text-white rounded-lg shadow-lg p-6 flex flex-col`}
            >
              <div className="relative mb-4 w-full aspect-video rounded-lg overflow-hidden bg-black/50 flex items-center justify-center">
                  <iframe 
                      className="w-full h-full"
                      src={item.videoUrl}
                      title={item.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      tabIndex={-1} 
                  />
                  <button 
                      onClick={() => handleViewVideo(item.videoUrl)}
                      className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      aria-label={`View video: ${item.title}`}
                  >
                      <PlayCircleIcon className="w-16 h-16 text-yellow-500" />
                  </button>
              </div>

              <h2 className="text-xl font-semibold mb-2 line-clamp-2">{item.title}</h2>
              <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-grow">{item.description || "No description provided."}</p>
              
              <div className="flex justify-between gap-2 mt-auto">
                {/* Active/Inactive is DISABLED if isAnyActionDisabled is true (i.e., processing OR editingId is set) */}
                <button
                  onClick={() => handleToggleActive(item)}
                  disabled={isAnyActionDisabled}
                  className={`px-4 py-1 rounded disabled:opacity-50 transition-colors font-semibold ${
                    item.isActive
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {item.isActive ? "Active " : "Inactive "}
                </button>
                
                <Link href="#video-heading">
                <button
                  onClick={() => handleEdit(item)}
                  disabled={isProcessing} // Edit button should only be disabled during processing, not by editingId itself.
                  className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600 disabled:opacity-50 transition-colors font-semibold"
                >
                  Edit
                </button>
                </Link>
                {/* Delete is DISABLED if isAnyActionDisabled is true */}
                <button
                  onClick={() => confirmDelete(item.id)}
                  disabled={isAnyActionDisabled}
                  className="bg-red-700 text-white px-4 py-1 rounded hover:bg-red-600 disabled:opacity-50 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    

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
                  modalType === "success" ? "text-green-600" : modalType === "warning" ? "text-yellow-600" : "text-red-600"
                }`}
              >
                {modalType === "success" ? "Success " : modalType === "warning" ? "Warning " : "Error "}
              </Dialog.Title>
              <p className="mt-2 whitespace-pre-wrap">{modalMessage}</p>
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
          onClose={() => !isProcessing && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title className="text-lg font-bold text-red-600">
                Confirm Delete
              </Dialog.Title>
              <p className="mt-2">
                Are you sure you want to delete this video?
              </p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isVideoViewerOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsVideoViewerOpen(false)}
        >
          <div className="fixed inset-0 bg-black/80" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-4xl h-auto aspect-video rounded-lg shadow-2xl bg-black relative">
              <button
                className="absolute top-2 right-2 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-black/70 z-10"
                onClick={() => setIsVideoViewerOpen(false)}
              >
                &times;
              </button>
              <iframe 
                  className="w-full h-full rounded-lg"
                  src={urlToView || ""}
                  title="Video Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
              />
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>

    </div>
  );
}