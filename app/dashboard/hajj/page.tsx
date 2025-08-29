"use client";
import { useState, useEffect, useRef, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

interface Package {
  id: number;
  title: string;
  price: number;
  imageUrl: string;
  isActive: boolean;
  category: "Economic" | "Standard" | "Premium";
}

const categories: Package["category"][] = ["Economic", "Standard", "Premium"];

export default function HajjDashboardPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Package["category"]>("Economic");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ref for file input (to reset it later)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ================= Popup Modal =================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning">(
    "success"
  );

  // ================= Delete Confirm Modal =================
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showModal = (msg: string, type: "success" | "error" | "warning") => {
    setModalMessage(msg);
    setModalType(type);
    setIsModalOpen(true);
  };

  // ---------------- FETCH ----------------
  const fetchPackages = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/hajj?all=true");
      if (!res.ok) throw new Error("Failed to fetch packages");
      const data: Package[] = await res.json();
      setPackages(data);
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      setPackages([]);
      showModal("⚠️ Error fetching packages", "error");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  // ---------------- ADD / UPDATE ----------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showModal("⚠️ Enter package title", "warning");
    if (!price || parseFloat(price) <= 0)
      return showModal("⚠️ Enter valid price", "warning");

    setLoading(true);
    try {
      const formData = new FormData();
      if (id) formData.append("id", id);
      formData.append("title", title);
      formData.append("price", price);
      formData.append("category", category);
      if (file) formData.append("file", file);
      formData.append("isActive", "true");

      const existing = packages.find((p) => p.category === category);
      if (existing && !id) {
        await fetch(`/api/hajj?id=${existing.id}`, { method: "DELETE" });
      }

      const res = await fetch("/api/hajj", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      showModal("✅ Package saved successfully!", "success");
      resetForm();
      fetchPackages();
    } catch (err) {
      console.error("❌ Save Error:", err);
      showModal("⚠️ Error saving package", "error");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- TOGGLE ACTIVE ----------------
  const toggleActive = async (pkg: Package) => {
    try {
      setFetching(true);
      const res = await fetch("/api/hajj", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pkg.id, isActive: !pkg.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle active");
      showModal("✅ Status updated successfully!", "success");
      fetchPackages();
    } catch (err) {
      console.error("❌ Toggle Error:", err);
      showModal("⚠️ Could not update status", "error");
    }
  };

  // ---------------- DELETE ----------------
  const confirmDelete = (pkgId: number) => {
    setDeleteId(pkgId);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/hajj?id=${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        showModal("🗑️ Package deleted successfully!", "success");
        fetchPackages();
      } else {
        showModal("❌ Failed to delete package", "error");
      }
    } catch (err) {
      console.error("❌ Delete Error:", err);
      showModal("⚠️ Could not delete package", "error");
    } finally {
      setDeleting(false);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // ---------------- RESET FORM ----------------
  const resetForm = () => {
    setId(null);
    setTitle("");
    setPrice("");
    setCategory("Economic");
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // reset file input field
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🕋 Hajj Packages Dashboard
      </h1>

      {/* ================= LOADING SPINNER ================= */}
      {fetching && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400"></div>
        </div>
      )}

      {/* ================= FORM ================= */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-gray-900 text-white shadow-lg rounded-2xl p-6 mb-10"
      >
        <input
          type="text"
          placeholder="Package Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
        />
        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black placeholder-gray-400"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Package["category"])}
          disabled={!!id}
          className={`border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black text-white ${
            id ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : null);
          }}
          className="border border-gray-700 p-2 w-full rounded focus:ring-2 focus:ring-yellow-400 bg-black text-white"
        />

        {preview && (
          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-2">Image Preview:</p>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-[300px] object-cover rounded-lg border"
            />
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-yellow-500 text-black px-6 py-2 rounded-lg w-full hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Uploading..." : id ? "Update Package" : "Save Package"}
          </button>
          {id && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ================= LIST ================= */}
      {packages.length === 0 ? (
        <p className="text-center text-gray-500">No packages available yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-gray-900 text-white rounded-lg shadow p-4 flex flex-col"
            >
              <img
                src={pkg.imageUrl || "/placeholder.png"}
                alt={pkg.title}
                className="w-full h-48 object-cover rounded mb-2"
              />
              <h2 className="font-bold text-lg">{pkg.title}</h2>
              <p className="text-gray-300">Price: ${pkg.price}</p>
              <p className="text-gray-400 mb-3 text-sm">
                Category: {pkg.category}
              </p>

              <div className="flex justify-between gap-2 mt-auto">
                <button
                  onClick={() => toggleActive(pkg)}
                  className={`px-4 py-1 rounded ${
                    pkg.isActive
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {pkg.isActive ? "Active ✅" : "Inactive ❌"}
                </button>

                <button
                  onClick={() => {
                    setId(pkg.id.toString());
                    setTitle(pkg.title);
                    setPrice(pkg.price.toString());
                    setCategory(pkg.category);
                    setPreview(pkg.imageUrl);
                  }}
                  className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>

                <button
                  onClick={() => confirmDelete(pkg.id)}
                  className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL POPUP ================= */}
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

      {/* ================= DELETE CONFIRM MODAL ================= */}
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
              <p className="mt-2">
                Are you sure you want to delete this package?
              </p>
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
