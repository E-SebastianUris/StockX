import { useState, useEffect, useCallback } from 'react';
import { proveedoresApi } from '../../api/inventario';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import PageHeader from '../../components/PageHeader';

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
      {/* Modern Page Header */}
      <PageHeader
        title="Proveedores"
        description="Administrá los proveedores de mercadería del kiosco"
        badge="Proveedores"
        icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
      >
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm shadow-blue-500/25 transition"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proveedor
        </button>
      </PageHeader>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o CUIT..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-zinc-800/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Cargando proveedores...
          </div>
        ) : proveedores.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            No se encontraron proveedores registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-300">
              <thead className="bg-gray-50/70 dark:bg-zinc-800/50 text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Nombre</th>
                  <th className="px-6 py-3.5">Contacto / Tel</th>
                  <th className="px-6 py-3.5">Email / Dirección</th>
                  <th className="px-6 py-3.5">CUIT</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/70">
                {proveedores.map((prov) => (
                  <tr key={prov.id} className="hover:bg-gray-50/60 dark:hover:bg-zinc-800/40 transition">
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-zinc-100">{prov.nombre}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-zinc-100 text-xs font-medium">{prov.contacto || '-'}</div>
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500">{prov.telefono}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-zinc-100 text-xs">{prov.email || '-'}</div>
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate max-w-xs">{prov.direccion}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-zinc-300">{prov.cuit || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          prov.activo
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-700'
                        }`}
                      >
                        {prov.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(prov)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleOpenDelete(prov.id)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/60 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
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
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300 text-sm">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Nombre / Razón Social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Distribuidora Arcor S.A."
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                CUIT
              </label>
              <input
                type="text"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: 30-12345678-9"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Persona de contacto
              </label>
              <input
                type="text"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: 011-4567-8900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="contacto@proveedor.com"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-400 mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm bg-gray-50/50 dark:bg-zinc-800/50 text-gray-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-zinc-700 rounded"
            />
            <label htmlFor="prov-activo" className="ml-2 block text-sm text-gray-700 dark:text-zinc-300 font-semibold">
              Proveedor activo
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="px-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center min-w-[90px] shadow-sm shadow-blue-500/25"
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
