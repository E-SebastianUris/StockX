import { useState, useEffect, useCallback } from 'react';
import { proveedoresApi } from '../../api/inventario';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    cuit: '',
    activo: true,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Confirm delete state
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadProveedores = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const data = await proveedoresApi.getAll(params);
      setProveedores(data);
    } catch (err) {
      console.error('Error al cargar proveedores:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProveedores();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProveedores]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      cuit: '',
      activo: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nombre: item.nombre,
      contacto: item.contacto || '',
      telefono: item.telefono || '',
      email: item.email || '',
      direccion: item.direccion || '',
      cuit: item.cuit || '',
      activo: item.activo,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setFormError('El nombre del proveedor es obligatorio.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingItem) {
        await proveedoresApi.update(editingItem.id, formData);
      } else {
        await proveedoresApi.create(formData);
      }
      setIsModalOpen(false);
      loadProveedores();
    } catch (err) {
      console.error('Error al guardar proveedor:', err);
      const msg =
        err.response?.data?.nombre?.[0] ||
        err.response?.data?.cuit?.[0] ||
        err.response?.data?.email?.[0] ||
        'Error al guardar. Verifique los datos ingresados.';
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
      await proveedoresApi.delete(deleteId);
      setIsDeleteOpen(false);
      setDeleteId(null);
      loadProveedores();
    } catch (err) {
      console.error('Error al eliminar proveedor:', err);
      setDeleteError('No se pudo eliminar el proveedor. Podría tener productos asociados.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Proveedores</h1>
          <p className="text-sm text-gray-500">Administrá los proveedores de mercadería del kiosco</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
        >
          <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o CUIT..."
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
            Cargando proveedores...
          </div>
        ) : proveedores.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron proveedores registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Contacto / Tel</th>
                  <th className="px-6 py-3">Email / Dirección</th>
                  <th className="px-6 py-3">CUIT</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {proveedores.map((prov) => (
                  <tr key={prov.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{prov.nombre}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{prov.contacto || '-'}</div>
                      <div className="text-xs text-gray-500">{prov.telefono}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{prov.email || '-'}</div>
                      <div className="text-xs text-gray-500">{prov.direccion}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{prov.cuit || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          prov.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {prov.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(prov)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleOpenDelete(prov.id)}
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
        title={editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Nombre / Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Distribuidora Arcor S.A."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                CUIT
              </label>
              <input
                type="text"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: 30-12345678-9"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Persona de contacto
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: 011-4567-8900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="contacto@proveedor.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Av. Rivadavia 1234, CABA"
              />
            </div>
          </div>

          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              id="prov-activo"
              checked={formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="prov-activo" className="ml-2 block text-sm text-gray-700 font-medium">
              Proveedor activo
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
        title="Eliminar Proveedor"
        message="¿Estás seguro de que deseás eliminar este proveedor? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
