import { useState, useEffect, useCallback } from 'react';
import { categoriasApi } from '../../api/inventario';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', activo: true });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm delete state
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCategorias = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const data = await categoriasApi.getAll(params);
      setCategorias(data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategorias();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCategorias]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ nombre: '', descripcion: '', activo: true });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      activo: item.activo,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre de la categoría es obligatorio.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingItem) {
        await categoriasApi.update(editingItem.id, formData);
      } else {
        await categoriasApi.create(formData);
      }
      setIsModalOpen(false);
      loadCategorias();
    } catch (err) {
      console.error('Error al guardar categoría:', err);
      const msg = err.response?.data?.nombre?.[0] || 'Error al guardar. Verifique los datos.';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (id) => {
    setDeleteId(id);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await categoriasApi.delete(deleteId);
      setIsDeleteOpen(false);
      setDeleteId(null);
      loadCategorias();
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      if (err.response?.status === 409) {
        setDeleteError(err.response.data.detail || 'No se puede eliminar: tiene productos asociados.');
      } else {
        setDeleteError('Ocurrió un error al intentar eliminar la categoría.');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Categorías</h1>
          <p className="text-sm text-gray-500">Administrá las categorías de productos del kiosco</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
        >
          <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Categoría
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando categorías...
          </div>
        ) : categorias.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron categorías registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Descripción</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{cat.nombre}</td>
                    <td className="px-6 py-4 text-gray-500">{cat.descripcion || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cat.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {cat.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleOpenDelete(cat.id)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm transition"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Ej: Golosinas, Bebidas..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Opcional..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="cat-activo"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="cat-activo" className="ml-2 block text-sm text-gray-700 font-medium">
              Categoría activa
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center min-w-[90px]"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmación Eliminar */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Categoría"
        message="¿Estás seguro de que deseás eliminar esta categoría? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
