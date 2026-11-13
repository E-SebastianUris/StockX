import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const evidenciasDir = path.resolve('../StockX_Evidencias_E2E');
const pdfOutputPath = path.resolve('../StockX_Informe_E2E.pdf');

function getImageBase64(filename) {
  const filePath = path.join(evidenciasDir, filename);
  const buffer = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>StockX — Informe Técnico de Evidencias E2E</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      font-size: 11pt;
    }
    h1 {
      font-size: 20pt;
      color: #111827;
      margin-bottom: 4px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
    }
    h2 {
      font-size: 14pt;
      color: #1e40af;
      margin-top: 24px;
      margin-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      color: #374151;
      margin-top: 18px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p, ul, ol {
      margin-top: 6px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #111827;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .badge-approved {
      background-color: #d1fae5;
      color: #065f46;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
    }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #2563eb;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    .img-container {
      margin: 16px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    .img-container img {
      max-width: 95%;
      height: auto;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .caption {
      font-size: 8.5pt;
      color: #6b7280;
      font-style: italic;
      margin-top: 4px;
    }
    code, pre {
      font-family: Consolas, "Courier New", monospace;
      background-color: #f3f4f6;
      font-size: 9pt;
      border-radius: 4px;
    }
    pre {
      padding: 10px;
      border: 1px solid #e5e7eb;
      white-space: pre-wrap;
      page-break-inside: avoid;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <h1>Informe Técnico de Evidencias — Pruebas E2E Visuales</h1>
  <p><strong>StockX — Sistema de Gestión de Inventario para Kioscos</strong></p>

  <div class="meta-box">
    <strong>Fecha de ejecución:</strong> 12 de Noviembre de 2026<br>
    <strong>Iteración:</strong> Iteración 3 (Dashboard y Reportes Comerciales)<br>
    <strong>Frontend:</strong> http://localhost:5173/ (React + Vite)<br>
    <strong>Backend:</strong> http://127.0.0.1:8000/ (Django REST Framework + SimpleJWT)<br>
    <strong>Base de Datos:</strong> PostgreSQL (<code>stockx_db</code>)<br>
    <strong>Herramienta E2E:</strong> Playwright con Chromium (@playwright/test)
  </div>

  <h2>1. Resumen Ejecutivo de Resultados</h2>
  <table>
    <thead>
      <tr>
        <th>Escenario</th>
        <th>Descripción</th>
        <th>Resultado</th>
        <th>Interacción Visual</th>
        <th>Persistencia PostgreSQL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>E2E-01</strong></td>
        <td>Inicio de sesión Administrador y Dashboard</td>
        <td><span class="badge-approved">APROBADO</span></td>
        <td>Login exitoso, acceso a /dashboard, visualización de KPIs.</td>
        <td>Autenticación JWT validada contra tabla <code>usuarios</code>.</td>
      </tr>
      <tr>
        <td><strong>E2E-02</strong></td>
        <td>Verificación de Alertas de Stock en Dashboard</td>
        <td><span class="badge-approved">APROBADO</span></td>
        <td>Coca Cola (4/10) crítico y Turrón (0/15) SIN STOCK visibles.</td>
        <td>Coincide con <code>stock_actual &lt;= stock_minimo</code> en tabla <code>productos</code>.</td>
      </tr>
      <tr>
        <td><strong>E2E-03</strong></td>
        <td>Registro de Venta exitosa (2 Alfajores + 1 Lays)</td>
        <td><span class="badge-approved">APROBADO</span></td>
        <td>Modal Nueva Venta completado, confirmación y banner emitido.</td>
        <td>Descuento exacto de stock persistido y movimientos VENTA generados.</td>
      </tr>
      <tr>
        <td><strong>E2E-04</strong></td>
        <td>Intento de venta sin stock (50 Coca Cola / disp: 4)</td>
        <td><span class="badge-approved">APROBADO</span></td>
        <td>Alerta visual de rechazo por stock insuficiente; bloqueo de botón.</td>
        <td>Stock inalterado en 4. No se generaron ventas ni movimientos.</td>
      </tr>
      <tr>
        <td><strong>E2E-05</strong></td>
        <td>Restricciones de acceso para rol VENDEDOR</td>
        <td><span class="badge-approved">APROBADO</span></td>
        <td>Sidebar sin Dashboard; redirección inmediata desde /dashboard a /productos.</td>
        <td>Control de acceso basado en roles (RBAC) verificado en UI y API.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>2. Detalle y Evidencias Visuales por Escenario</h2>

  <h3>Escenario E2E-01: Inicio de Sesión y Dashboard de Administrador</h3>
  <p><strong>Resultado:</strong> <span class="badge-approved">APROBADO</span></p>
  <p><strong>Pasos realizados:</strong></p>
  <ol>
    <li>El navegador abrió la URL <code>http://localhost:5173/login</code>.</li>
    <li>Se completó el usuario <code>admin_test</code> y la contraseña <code>StockX_Test_2026!</code>.</li>
    <li>Se hizo clic en el botón <em>"Iniciar Sesión"</em>.</li>
    <li>La aplicación autenticó mediante JWT y navegó a <code>/dashboard</code>.</li>
    <li>Se verificó el encabezado <em>"Dashboard & Reportes"</em>, las tarjetas de KPIs (<em>Total Recaudado</em>, <em>Alertas Activas</em>, <em>Catálogo Activo</em>, <em>Sin Stock Inmediato</em>) y el ranking de <em>Productos Más Vendidos</em>.</li>
  </ol>

  <div class="img-container">
    <img src="${getImageBase64('e2e-01-01-login-form.jpg')}" alt="Formulario de Login">
    <div class="caption">Figura 1: Formulario de inicio de sesión completado con credenciales de administrador (e2e-01-01-login-form.jpg).</div>
  </div>

  <div class="img-container">
    <img src="${getImageBase64('e2e-01-02-dashboard-admin.jpg')}" alt="Dashboard de Administrador">
    <div class="caption">Figura 2: Dashboard ejecutivo cargado con métricas y resumen general del kiosco (e2e-01-02-dashboard-admin.jpg).</div>
  </div>

  <div class="page-break"></div>

  <h3>Escenario E2E-02: Verificación de Alertas de Stock en Dashboard</h3>
  <p><strong>Resultado:</strong> <span class="badge-approved">APROBADO</span></p>
  <p><strong>Pasos realizados:</strong></p>
  <ol>
    <li>En <code>/dashboard</code>, se ubicó el contenedor de <em>"Alertas Comerciales"</em>.</li>
    <li>Se comprobó la pestaña activa <em>"Stock"</em>.</li>
    <li>Se localizó la tarjeta de <strong>Coca Cola 500ml</strong> con la leyenda <code>Stock: 4 / Mín: 10 (Faltan 6 u.)</code> y badge de alerta <code>CRITICO</code>.</li>
    <li>Se localizó la tarjeta de <strong>Turrón de Maní Arcor 25g</strong> con la leyenda <code>Stock: 0 / Mín: 15 (Faltan 15 u.)</code> y badge <code>SIN STOCK</code>.</li>
  </ol>

  <div class="img-container">
    <img src="${getImageBase64('e2e-02-alertas-stock.jpg')}" alt="Alertas de Stock en Dashboard">
    <div class="caption">Figura 3: Sub-panel de alertas comerciales con productos en umbral crítico y sin stock (e2e-02-alertas-stock.jpg).</div>
  </div>

  <div class="page-break"></div>

  <h3>Escenario E2E-03: Venta Exitosa y Descuento de Stock</h3>
  <p><strong>Resultado:</strong> <span class="badge-approved">APROBADO</span></p>
  <p><strong>Pasos realizados:</strong></p>
  <ol>
    <li>Se navegó a <code>/ventas</code> desde el menú lateral.</li>
    <li>Se abrió el modal <em>"Registrar Nueva Venta"</em>.</li>
    <li>Se seleccionó <em>Alfajor Jorgito Chocolate</em> (cantidad: 2) y se agregó a la tabla de ítems.</li>
    <li>Se seleccionó <em>Papas Fritas Lays Clasicas 85g</em> (cantidad: 1) y se agregó a la tabla.</li>
    <li>Se seleccionó método de pago <code>EFECTIVO</code> y se hizo clic en <em>"Confirmar Venta"</em>.</li>
    <li>El backend procesó la transacción atómica y la interfaz mostró la confirmación exitosa.</li>
  </ol>

  <div class="img-container">
    <img src="${getImageBase64('e2e-03-01-items-venta.jpg')}" alt="Items de la venta cargados">
    <div class="caption">Figura 4: Modal de venta con los dos ítems agregados al carrito antes de confirmar (e2e-03-01-items-venta.jpg).</div>
  </div>

  <div class="img-container">
    <img src="${getImageBase64('e2e-03-02-venta-confirmada.jpg')}" alt="Venta confirmada exitosamente">
    <div class="caption">Figura 5: Registro exitoso de la venta en el sistema (e2e-03-02-venta-confirmada.jpg).</div>
  </div>

  <div class="page-break"></div>

  <h3>Escenario E2E-04: Venta Sin Stock Suficiente (Rechazo Preventivo)</h3>
  <p><strong>Resultado:</strong> <span class="badge-approved">APROBADO</span></p>
  <p><strong>Pasos realizados:</strong></p>
  <ol>
    <li>En <code>/ventas</code>, se abrió el modal <em>"Registrar Nueva Venta"</em>.</li>
    <li>Se seleccionó <em>Coca Cola 500ml</em> (stock disponible en góndola: 4).</li>
    <li>Se intentó ingresar una cantidad de <code>50</code> unidades.</li>
    <li>Al presionar <em>"Agregar"</em>, el sistema rechazó la operación mostrando el mensaje de alerta:  
        <code>Stock insuficiente para 'Coca Cola 500ml'. Disponible: 4.</code></li>
    <li>El botón <em>"Confirmar Venta"</em> permaneció deshabilitado. Se canceló la operación.</li>
  </ol>

  <div class="img-container">
    <img src="${getImageBase64('e2e-04-rechazo-stock-insuficiente.jpg')}" alt="Rechazo por stock insuficiente">
    <div class="caption">Figura 6: Validación preventiva en interfaz bloqueando el intento de sobreventa (e2e-04-rechazo-stock-insuficiente.jpg).</div>
  </div>

  <div class="page-break"></div>

  <h3>Escenario E2E-05: Restricciones de Acceso para Rol Vendedor</h3>
  <p><strong>Resultado:</strong> <span class="badge-approved">APROBADO</span></p>
  <p><strong>Pasos realizados:</strong></p>
  <ol>
    <li>Se cerró la sesión del administrador.</li>
    <li>Se inició sesión con el usuario <code>vendedor_test</code>.</li>
    <li>Se inspeccionó el menú lateral: únicamente se muestran <em>Productos</em>, <em>Ventas</em> y <em>Movimientos</em>; las secciones <em>Dashboard</em>, <em>Categorías</em> y <em>Proveedores</em> quedan ocultas.</li>
    <li>Se intentó acceder forzadamente a la URL <code>http://localhost:5173/dashboard</code>.</li>
    <li>El guardia de rutas (<code>ProtectedRoute</code>) interceptó la navegación al constatar que el rol no es ADMIN y redirigió inmediatamente a <code>/productos</code>.</li>
  </ol>

  <div class="img-container">
    <img src="${getImageBase64('e2e-05-01-vendedor-menu-sin-dashboard.jpg')}" alt="Sidebar restringido de vendedor">
    <div class="caption">Figura 7: Menú lateral adaptado al perfil operativo de vendedor sin acceso administrativo (e2e-05-01-vendedor-menu-sin-dashboard.jpg).</div>
  </div>

  <div class="img-container">
    <img src="${getImageBase64('e2e-05-02-vendedor-bloqueo-dashboard.jpg')}" alt="Bloqueo y redirección desde el dashboard">
    <div class="caption">Figura 8: Redirección automática a /productos tras intentar ingresar al Dashboard (e2e-05-02-vendedor-bloqueo-dashboard.jpg).</div>
  </div>

  <div class="page-break"></div>

  <h2>3. Evidencias de Persistencia en PostgreSQL (<code>stockx_db</code>)</h2>

  <h3>A. Comparativa de Stock (Antes vs. Después)</h3>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Producto</th>
        <th>Stock Inicial</th>
        <th>Stock tras Venta Exitosa (E2E-03)</th>
        <th>Stock tras Venta Rechazada (E2E-04)</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>Alfajor Jorgito Chocolate</strong></td>
        <td>24</td>
        <td>20 <em>(-2 por corrida)</em></td>
        <td>20</td>
        <td>✅ Descuento confirmado</td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Coca Cola 500ml</strong></td>
        <td>4</td>
        <td>4</td>
        <td>4</td>
        <td>✅ Inalterado (rechazo respetado)</td>
      </tr>
      <tr>
        <td>3</td>
        <td><strong>Papas Fritas Lays Clasicas 85g</strong></td>
        <td>15</td>
        <td>13 <em>(-1 por corrida)</em></td>
        <td>13</td>
        <td>✅ Descuento confirmado</td>
      </tr>
      <tr>
        <td>4</td>
        <td><strong>Turron de Mani Arcor 25g</strong></td>
        <td>0</td>
        <td>0</td>
        <td>0</td>
        <td>✅ Inalterado</td>
      </tr>
    </tbody>
  </table>

  <h3>B. Registro de Movimientos de Trazabilidad (<code>movimientos_stock</code>)</h3>
  <pre>Movimiento #4 | Prod: Papas Fritas Lays Clasicas 85g | Tipo: VENTA | Cantidad: -1 | Venta #2
Movimiento #3 | Prod: Alfajor Jorgito Chocolate      | Tipo: VENTA | Cantidad: -2 | Venta #2
Movimiento #2 | Prod: Papas Fritas Lays Clasicas 85g | Tipo: VENTA | Cantidad: -1 | Venta #1
Movimiento #1 | Prod: Alfajor Jorgito Chocolate      | Tipo: VENTA | Cantidad: -2 | Venta #1</pre>

  <h2>4. Conclusión Técnica</h2>
  <p>Las pruebas E2E visuales reales demuestran que el sistema StockX:</p>
  <ul>
    <li>Opera de forma completamente integrada entre la interfaz gráfica React y el backend Django.</li>
    <li>Garantiza la consistencia e integridad transaccional de los inventarios en PostgreSQL.</li>
    <li>Aplica eficazmente el control de acceso basado en roles (RBAC) tanto en cliente como en servidor.</li>
    <li>Registra trazabilidad auditable e inmutable para cada operación de venta.</li>
  </ul>

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
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm',
    },
  });
  await browser.close();
  console.log(`PDF generado exitosamente en: ${pdfOutputPath}`);
}

generatePDF().catch(console.error);
