import { chromium } from '@playwright/test';
import path from 'path';

const pdfOutputPath = path.resolve('../StockX_Tabla_Objetivos_TFI.pdf');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>StockX — Cumplimiento de Objetivos Específicos TFI</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      line-height: 1.4;
      font-size: 9pt;
      margin: 0;
      padding: 0;
    }
    .header-box {
      border-bottom: 2px solid #1e40af;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title {
      font-size: 15pt;
      font-weight: 800;
      color: #111827;
      margin: 0;
    }
    .subtitle {
      font-size: 10pt;
      color: #4b5563;
      margin: 2px 0 0 0;
    }
    .meta-tag {
      font-size: 8.5pt;
      color: #6b7280;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      vertical-align: top;
    }
    th {
      background-color: #1e3a8a;
      color: #ffffff;
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .badge-cumplido {
      background-color: #dcfce7;
      color: #15803d;
      font-weight: 800;
      font-size: 8pt;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid #86efac;
      white-space: nowrap;
    }
    .badge-parcial {
      background-color: #fef9c3;
      color: #a16207;
      font-weight: 800;
      font-size: 8pt;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      border: 1px solid #fde047;
      white-space: nowrap;
    }
    .col-num {
      width: 25px;
      text-align: center;
      font-weight: bold;
    }
    .col-obj {
      width: 160px;
      font-weight: 600;
    }
    .col-estado {
      width: 110px;
      text-align: center;
    }
    .col-comp {
      width: 160px;
      font-family: Consolas, "Courier New", monospace;
      font-size: 8pt;
      color: #374151;
    }
    .col-tests {
      width: 90px;
      text-align: center;
      font-size: 8pt;
    }
    .col-e2e {
      width: 110px;
      text-align: center;
      font-size: 8pt;
    }
    .col-just {
      font-size: 8pt;
      color: #374151;
    }
    .footer-note {
      margin-top: 10px;
      font-size: 8pt;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <div class="header-box">
    <div>
      <h1 class="title">StockX — Matriz de Cumplimiento de Objetivos Específicos</h1>
      <p class="subtitle">Trabajo Final Integrador (TFI) — Sistema de Gestión de Inventario para Kioscos</p>
    </div>
    <div class="meta-tag">
      <strong>Estado al:</strong> 12/11/2026<br>
      <strong>Rama:</strong> <code>test/e2e-playwright</code>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-obj">Objetivo Específico</th>
        <th class="col-estado">Estado</th>
        <th class="col-comp">Componentes y Archivos Clave</th>
        <th class="col-tests">Pruebas Backend</th>
        <th class="col-e2e">Evidencia E2E</th>
        <th class="col-just">Justificación Técnica del Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="col-num">1</td>
        <td class="col-obj">Conocer el stock por categoría y proveedor</td>
        <td class="col-estado"><span class="badge-parcial">PARCIALMENTE CUMPLIDO</span></td>
        <td class="col-comp">ProductoViewSet, ProductosPage.jsx, ProductoProveedor</td>
        <td class="col-tests">3 tests<br>(inventario)</td>
        <td class="col-e2e">No evaluado en suite E2E</td>
        <td class="col-just">Filtro por categoría totalmente funcional; la vinculación con proveedores está implementada a nivel de detalle de producto (historial de compras), pero no existe un filtro o reporte agregado de stock por proveedor.</td>
      </tr>
      <tr>
        <td class="col-num">2</td>
        <td class="col-obj">Trazar los movimientos de stock</td>
        <td class="col-estado"><span class="badge-cumplido">CUMPLIDO</span></td>
        <td class="col-comp">MovimientoStock, MovimientoStockViewSet, MovimientosPage.jsx</td>
        <td class="col-tests">7 tests<br>(ventas)</td>
        <td class="col-e2e">E2E-03<br>(PostgreSQL)</td>
        <td class="col-just">Registro inmutable de trazabilidad (ingreso, egreso, ajuste, venta); auditoría visual en frontend y persistencia de movimientos verificada en base de datos tras ventas E2E.</td>
      </tr>
      <tr>
        <td class="col-num">3</td>
        <td class="col-obj">Anticipar faltantes mediante alertas de stock mínimo</td>
        <td class="col-estado"><span class="badge-cumplido">CUMPLIDO</span></td>
        <td class="col-comp">get_alertas_activas, DashboardPage.jsx, idx_prod_stock_alert</td>
        <td class="col-tests">3 tests<br>(dashboard)</td>
        <td class="col-e2e">E2E-02<br>(e2e-02-alertas-stock.jpg)</td>
        <td class="col-just">Clasificación automática en CRITICO y SIN STOCK con cálculo de unidades faltantes; comprobado visualmente con Coca Cola (4/10) y Turrón (0/15).</td>
      </tr>
      <tr>
        <td class="col-num">4</td>
        <td class="col-obj">Reducir pérdidas por vencimientos</td>
        <td class="col-estado"><span class="badge-cumplido">CUMPLIDO</span></td>
        <td class="col-comp">get_alertas_activas, alertas_vencimiento, idx_prod_vencimiento</td>
        <td class="col-tests">3 tests<br>(dashboard, inventario)</td>
        <td class="col-e2e">E2E-01 / E2E-02<br>(indirecta)</td>
        <td class="col-just">Detección preventiva en ventana de 15 días con niveles VENCIDO, URGENTE y PROXIMO; ampliamente respaldado por pruebas automatizadas de integración.</td>
      </tr>
      <tr>
        <td class="col-num">5</td>
        <td class="col-obj">Registrar ventas y descontar stock automáticamente</td>
        <td class="col-estado"><span class="badge-cumplido">CUMPLIDO</span></td>
        <td class="col-comp">VentaCreateSerializer, VentaViewSet, NuevaVentaModal.jsx</td>
        <td class="col-tests">5 tests<br>(ventas)</td>
        <td class="col-e2e">E2E-03, E2E-04<br>(capturas y PostgreSQL)</td>
        <td class="col-just">Transacción atómica con bloqueo pesimista (select_for_update); descuento automático verificado en BD y rechazo preventivo ante sobreventa sin stock comprobado en navegador y BD.</td>
      </tr>
      <tr>
        <td class="col-num">6</td>
        <td class="col-obj">Obtener reportes de productos más vendidos y rotación</td>
        <td class="col-estado"><span class="badge-cumplido">CUMPLIDO</span></td>
        <td class="col-comp">get_productos_mas_vendidos, get_rotacion_productos, DashboardPage.jsx</td>
        <td class="col-tests">8 tests<br>(dashboard)</td>
        <td class="col-e2e">E2E-01<br>(e2e-01-02-dashboard-admin.jpg)</td>
        <td class="col-just">Top 10 por unidades/facturación y cálculo de rotación (ALTA, MEDIA, BAJA, SIN_MOVIMIENTO) con diagnósticos comerciales; probado en casos borde y renderizado en UI.</td>
      </tr>
      <tr>
        <td class="col-num">7</td>
        <td class="col-obj">Proteger la información mediante roles y permisos</td>
        <td class="col-estado"><span class="badge-cumplido">CUMPLIDO</span></td>
        <td class="col-comp">IsAdminRolePermission, HasInventarioRolePermission, ProtectedRoute.jsx</td>
        <td class="col-tests">6 tests<br>(auth, inventario, dashboard, ventas)</td>
        <td class="col-e2e">E2E-01, E2E-05<br>(e2e-05-01, e2e-05-02)</td>
        <td class="col-just">Segregación estricta de perfiles ADMIN y VENDEDOR; restricción de endpoints con HTTP 403 y ocultamiento/bloqueo de rutas en frontend comprobado visualmente.</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note">
    <span>StockX © 2026 — Documentación Técnica de Validación</span>
    <span>42 pruebas automáticas de backend aprobadas • 5 pruebas E2E visuales aprobadas</span>
  </div>

</body>
</html>
`;

async function generatePDF() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.pdf({
    path: pdfOutputPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm',
    },
  });
  await browser.close();
  console.log(`PDF de la tabla de objetivos generado en: ${pdfOutputPath}`);
}

generatePDF().catch(console.error);
