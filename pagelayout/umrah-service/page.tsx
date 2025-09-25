"use client";

import { useState, useEffect, Fragment, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";

interface ServiceImage {
  id: number;
  url: string;
  publicId: string;
}

interface UmrahService {
  id: number;
  title: string;
  description: string;
  isActive: boolean;
  heroImage?: string;
  serviceImages: ServiceImage[];
}

export default function UmrahServiceDashboard() {
  const [services, setServices] = useState<UmrahService[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageType, setImageType] = useState<"background" | "services">("background");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  // --- New state for displaying current images in edit mode ---
  const [currentHeroImage, setCurrentHeroImage] = useState<string | undefined>(undefined);
  const [currentServiceImages, setCurrentServiceImages] = useState<ServiceImage[]>([]);
  // -----------------------------------------------------------

  // --- Loading States ---
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Use keys to force re-render and clear file inputs
  const [heroKey, setHeroKey] = useState(0);
  const [galleryKey, setGalleryKey] = useState(0);

  // --- Modal state ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">(
    "success"
  );

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // --- useRef for form scrolling ---
  const formRef = useRef<HTMLFormElement>(null);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  // ✅ Fetch services
  const fetchServices = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/umrah-service", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch services");
      const data = await res.json();
      setServices(data);
    } catch (err) {
      console.error("❌ Fetch error:", err);
      showModal("⚠️ Failed to fetch services", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // ✅ Reset form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageType("background");
    setHeroFile(null);
    setGalleryFiles([]);
    setIsActive(true);
    setEditingId(null);
    // --- Clear current image states on reset ---
    setCurrentHeroImage(undefined);
    setCurrentServiceImages([]);
    // ------------------------------------------
    setHeroKey(prev => prev + 1);
    setGalleryKey(prev => prev + 1);
  };

  // ✅ Save or Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!title.trim() || !description.trim()) {
      setLoading(false);
      return showModal("⚠️ Title and Description are required", "warning");
    }

    // Validation for new service
    if (!editingId) {
      if (imageType === "background" && !heroFile) {
        setLoading(false);
        return showModal("⚠️ Please upload a background image for a new service", "warning");
      }
      if (imageType === "services" && galleryFiles.length === 0) {
        setLoading(false);
        return showModal("⚠️ Please upload at least one service image for a new service", "warning");
      }
    }

    // Validation for editing: ensure there's a file OR an existing image
    if (editingId) {
      if (imageType === "background" && !heroFile && !currentHeroImage) {
        setLoading(false);
        return showModal("⚠️ Please upload a background image or ensure one exists", "warning");
      }
      if (imageType === "services" && galleryFiles.length === 0 && currentServiceImages.length === 0) {
        setLoading(false);
        return showModal("⚠️ Please upload at least one service image or ensure one exists", "warning");
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
    // NOTE: Sending the old image URLs is NOT needed, the backend should handle updates
    // based on the presence of a new file. If no new file is sent, the old one remains.
    if (imageType === "background" && heroFile) {
      formData.append("heroImage", heroFile);
    }
    if (imageType === "services" && galleryFiles.length > 0) {
      galleryFiles.forEach((file) => formData.append("serviceImages", file));
    }

    try {
      const res = await fetch("/api/umrah-service", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showModal(editingId ? "✅ Service updated!" : "✅ Service added!", "success");
      resetForm();
      fetchServices();
    } catch (err) {
      console.error("❌ Save error:", err);
      showModal("❌ Failed to save service", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit
  const handleEdit = (service: UmrahService) => {
    setEditingId(service.id);
    setTitle(service.title);
    setDescription(service.description);
    setIsActive(service.isActive);

    // Set the image type and current images for display
    if (service.heroImage) {
      setImageType("background");
      setCurrentHeroImage(service.heroImage);
      setCurrentServiceImages([]); // Clear other image state
    } else if (service.serviceImages.length > 0) {
      setImageType("services");
      setCurrentServiceImages(service.serviceImages);
      setCurrentHeroImage(undefined); // Clear other image state
    } else {
      // Handle case with no images (unlikely based on validation, but good to be safe)
      setImageType("background");
      setCurrentHeroImage(undefined);
      setCurrentServiceImages([]);
    }

    // Clear file inputs for *new* selection
    setHeroFile(null);
    setGalleryFiles([]);
    setHeroKey(prev => prev + 1); // Force re-render/clear input
    setGalleryKey(prev => prev + 1); // Force re-render/clear input

    // Scroll to the form
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/umrah-service?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      showModal("🗑️ Service deleted", "success");
      setDeleteId(null);
      fetchServices();
    } catch (err) {
      console.error("❌ Delete error:", err);
      showModal("❌ Failed to delete service", "error");
    } finally {
      setLoading(false);
      setIsDeleteOpen(false);
    }
  };

  // ✅ Toggle active/inactive
  const toggleActive = async (id: number, current: boolean) => {
    try {
      setLoading(true);
      const res = await fetch("/api/umrah-service", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !current }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      showModal("✅ Status updated!", "success");
      fetchServices();
    } catch (err) {
      console.error("❌ Toggle error:", err);
      showModal("⚠️ Could not update status", "error");
    } finally {
      setLoading(false);
    }
  };

  const heroServices = services.filter(service => service.heroImage);
  const galleryServices = services.filter(service => service.serviceImages.length > 0);
  const isEditing = !!editingId;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center" id="umrah-service">🕋 Umrah Services</h1>

      {/* --- GLOBAL LOADER --- */}
      {(loading || fetching) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* --- FORM --- */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10"
        ref={formRef}
      >
        <input
          type="text"
          placeholder="Service Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
          disabled={loading}
        />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400 resize-none"
          disabled={loading}
        />

        <select
          value={imageType}
          onChange={(e) => setImageType(e.target.value as "background" | "services")}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black text-white"
          disabled={isEditing || loading}
        >
          <option value="background">Background Image</option>
          <option value="services">Service Images</option>
        </select>

        {imageType === "background" && (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
              className="border border-gray-700 p-2 w-full rounded bg-black text-white"
              key={heroKey}
              disabled={loading}
            />
            {/* --- Display Current Hero Image in Edit Mode --- */}
            {isEditing && currentHeroImage && (
              <div className="p-2 border border-gray-700 rounded bg-gray-800">
                <p className="text-sm mb-2 text-gray-400">Current Background Image (Upload a new file to replace):</p>
                <img
                  src={currentHeroImage}
                  alt="Current Hero Image"
                  className="w-full h-40 object-cover rounded"
                />
              </div>
            )}
            {/* ------------------------------------------------ */}
          </div>
        )}

        {imageType === "services" && (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                setGalleryFiles(e.target.files ? Array.from(e.target.files) : [])
              }
              className="border border-gray-700 p-2 w-full rounded bg-black text-white"
              key={galleryKey}
              disabled={loading}
            />
            {/* --- Display Current Service Images in Edit Mode --- */}
            {isEditing && currentServiceImages.length > 0 && (
              <div className="p-2 border border-gray-700 rounded bg-gray-800">
                <p className="text-sm mb-2 text-gray-400">Current Service Images (Upload new files to add/replace):</p>
                <div className="grid grid-cols-4 gap-2">
                  {currentServiceImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt="Service Image"
                      className="w-full h-16 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}
            {/* --------------------------------------------------- */}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Saving..." : isEditing ? "Update Service" : "Save Service"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* --- LIST --- */}
      {!fetching && services.length === 0 ? (
        <p className="text-center text-gray-500">No Umrah services available.</p>
      ) : (
        <>
          {heroServices.length > 0 && (
            <div className="mb-10">
              <h1 className="text-2xl font-bold mb-4 text-center">Background Image</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {heroServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
                  >
                    <h2 className="font-bold text-lg">{service.title}</h2>
                    <p className="text-gray-300 mb-2 line-clamp-3">{service.description}</p>
                    <img
                      src={service.heroImage}
                      alt={service.title}
                      className="w-full h-56 object-cover rounded"
                    />
                    <div className="flex justify-between gap-2 mt-4">
                      <Link href="#umrah-service">
                      <button
                        onClick={() => handleEdit(service)}
                        className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600 disabled:opacity-50"
                        disabled={loading || isEditing}
                      >
                        Edit
                      </button>
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteId(service.id);
                          setIsDeleteOpen(true);
                        }}
                        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                        disabled={loading || isEditing}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => toggleActive(service.id, service.isActive)}
                        className={`px-4 py-1 rounded disabled:opacity-50 ${
                          service.isActive
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                        disabled={loading || isEditing}
                      >
                        {service.isActive ? "Active ✅" : "Inactive ❌"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {galleryServices.length > 0 && (
            <div>
              <h1 className="text-2xl font-bold mb-4 text-center">Service Images</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {galleryServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
                  >
                    <h2 className="font-bold text-lg">{service.title}</h2>
                    <p className="text-gray-300 mb-2 line-clamp-3">{service.description}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {service.serviceImages.slice(0, 4).map((img) => (
                        <img
                          key={img.id}
                          src={img.url}
                          alt=""
                          className="h-28 w-full object-cover rounded"
                        />
                      ))}
                    </div>
                    <div className="flex justify-between gap-2 mt-4">
                      <Link href="#umrah-service">
                      <button
                        onClick={() => handleEdit(service)}
                        className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600 disabled:opacity-50"
                        disabled={loading || isEditing}
                      >
                        Edit
                      </button>
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteId(service.id);
                          setIsDeleteOpen(true);
                        }}
                        className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                        disabled={loading || isEditing}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => toggleActive(service.id, service.isActive)}
                        className={`px-4 py-1 rounded disabled:opacity-50 ${
                          service.isActive
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-gray-500 hover:bg-gray-600"
                        }`}
                        disabled={loading || isEditing}
                      >
                        {service.isActive ? "Active ✅" : "Inactive ❌"}
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
          onClose={() => !loading && setIsModalOpen(false)}
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
                  disabled={loading}
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
          onClose={() => !loading && setIsDeleteOpen(false)}
        >
          <div className="fixed inset-0 bg-black/50" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-2xl p-6 text-center shadow-xl bg-white text-black">
              <Dialog.Title className="text-lg font-bold text-red-600">
                Confirm Delete
              </Dialog.Title>
              <p className="mt-2">Are you sure you want to delete this service?</p>
              <div className="mt-4 flex justify-center gap-4">
                <button
                  className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}