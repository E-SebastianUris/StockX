import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const EVIDENCIAS_DIR = path.resolve('tests-e2e/evidencias');

test.beforeAll(() => {
  if (!fs.existsSync(EVIDENCIAS_DIR)) {
    fs.mkdirSync(EVIDENCIAS_DIR, { recursive: true });
  }
});

async function loginAs(page, username, password) {
  await page.goto('/login');
  await page.fill('input[autoComplete="username"], input[placeholder*="usuario"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

test.describe.serial('Pruebas E2E StockX — Iteración 3', () => {

  test('E2E-01: Login de Administrador y visualización del Dashboard', async ({ page }) => {
    // 1. Abrir login
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('StockX');

    // 2. Completar credenciales de admin_test
    await page.fill('input[autoComplete="username"], input[placeholder*="usuario"]', 'admin_test');
    await page.fill('input[type="password"]', 'StockX_Test_2026!');
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-01-01-login-form.png') });

    // 3. Clic en Iniciar Sesión
    await page.click('button[type="submit"]');

    // 4. Redirección y acceso al dashboard
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    
    // Si redirige a /productos, navegar al Dashboard desde la barra lateral
    if (!page.url().includes('/dashboard')) {
      await page.click('nav a[href="/dashboard"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    // 5. Verificar encabezado y KPIs del Dashboard
    await expect(page.locator('h1')).toContainText('Dashboard & Reportes');
    await expect(page.getByText('Total Recaudado')).toBeVisible();
    await expect(page.getByText('Alertas Activas')).toBeVisible();
    await expect(page.getByText('Catálogo Activo')).toBeVisible();

    // 6. Evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-01-02-dashboard-admin.png'), fullPage: true });
  });

  test('E2E-02: Verificación de Alertas de Stock en el Dashboard', async ({ page }) => {
    // 1. Iniciar sesión como administrador
    await loginAs(page, 'admin_test', 'StockX_Test_2026!');

    // 2. Navegar a /dashboard
    await page.goto('/dashboard');
    await page.waitForURL('**/dashboard');

    // 3. Asegurarse de que la sección de Alertas Comerciales esté visible
    await expect(page.getByText('Alertas Comerciales')).toBeVisible();

    // Pestaña Stock activa por defecto
    const stockTab = page.locator('button', { hasText: 'Stock' });
    await expect(stockTab).toBeVisible();

    // 4. Verificar alerta de Coca Cola 500ml (4/10)
    const cocaCard = page.locator('div', { hasText: 'Coca Cola 500ml' }).filter({ hasText: 'Stock:' }).first();
    await expect(cocaCard).toBeVisible();
    await expect(cocaCard).toContainText('4');
    await expect(cocaCard).toContainText('10');

    // 5. Verificar alerta de Turrón de Maní Arcor 25g (0/15)
    const turronCard = page.locator('div', { hasText: 'Turr' }).filter({ hasText: 'Stock:' }).first();
    await expect(turronCard).toBeVisible();
    await expect(turronCard).toContainText('0');
    await expect(turronCard).toContainText('15');
    await expect(turronCard).toContainText('SIN STOCK');

    // 6. Captura de pantalla de evidencia
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-02-alertas-stock.png'), fullPage: true });
  });

  test('E2E-03: Venta exitosa de 2 Alfajores y 1 Papas Lays', async ({ page }) => {
    // 1. Iniciar sesión como administrador
    await loginAs(page, 'admin_test', 'StockX_Test_2026!');

    // 2. Navegar a /ventas
    await page.goto('/ventas');
    await page.waitForURL('**/ventas');
    await expect(page.locator('h1')).toContainText('Ventas');

    // 3. Abrir modal Nueva Venta
    await page.click('button:has-text("Nueva Venta")');
    await expect(page.getByText('Registrar Nueva Venta')).toBeVisible();

    // 4. Localizar el select de producto DENTRO del modal
    const modal = page.locator('div:has(> div:has-text("Registrar Nueva Venta"))');
    const selectProducto = page.locator('select', { has: page.locator('option', { hasText: 'Seleccionar producto disponible' }) });
    const cantidadInput = page.locator('div:has(> label:has-text("Cantidad")) input[type="number"]');

    // Seleccionar primer producto: Alfajor Jorgito Chocolate (cant: 2)
    const alfajorOption = await selectProducto.locator('option', { hasText: 'Alfajor Jorgito' }).first().getAttribute('value');
    await selectProducto.selectOption(alfajorOption);
    await cantidadInput.fill('2');
    await page.click('button:has-text("Agregar")');

    // 5. Seleccionar segundo producto: Papas Fritas Lays Clasicas 85g (cant: 1)
    const laysOption = await selectProducto.locator('option', { hasText: 'Papas Fritas Lays' }).first().getAttribute('value');
    await selectProducto.selectOption(laysOption);
    await cantidadInput.fill('1');
    await page.click('button:has-text("Agregar")');

    // 6. Verificar que ambos ítems están en la tabla del carrito
    const tablaCarrito = page.locator('div:has(> h4:has-text("Ítems de la venta")) table');
    await expect(tablaCarrito.locator('tr', { hasText: 'Alfajor Jorgito' })).toBeVisible();
    await expect(tablaCarrito.locator('tr', { hasText: 'Papas Fritas Lays' })).toBeVisible();

    // Evidencia antes de confirmar
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-03-01-items-venta.png') });

    // 7. Confirmar la venta
    const btnConfirmar = page.locator('button:has-text("Confirmar Venta")');
    await expect(btnConfirmar).toBeEnabled();
    await btnConfirmar.click();

    // 8. Esperar resultado: banner de éxito o modal de detalle
    await expect(page.locator('text=registrada exitosamente').or(page.locator('text=Venta #'))).toBeVisible({ timeout: 15000 });

    // Evidencia de venta confirmada
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-03-02-venta-confirmada.png'), fullPage: true });
  });

  test('E2E-04: Rechazo al intentar vender 50 Coca Cola cuando hay 4 disponibles', async ({ page }) => {
    // 1. Iniciar sesión como administrador
    await loginAs(page, 'admin_test', 'StockX_Test_2026!');

    // 2. Navegar a /ventas
    await page.goto('/ventas');
    await page.waitForURL('**/ventas');

    // 3. Abrir modal Nueva Venta
    await page.click('button:has-text("Nueva Venta")');
    await expect(page.getByText('Registrar Nueva Venta')).toBeVisible();

    // 4. Seleccionar Coca Cola 500ml (stock actual: 4) en el selector del modal
    const selectProducto = page.locator('select', { has: page.locator('option', { hasText: 'Seleccionar producto disponible' }) });
    const cantidadInput = page.locator('div:has(> label:has-text("Cantidad")) input[type="number"]');

    const cocaOption = await selectProducto.locator('option', { hasText: 'Coca Cola 500ml' }).first().getAttribute('value');
    await selectProducto.selectOption(cocaOption);

    // 5. Intentar colocar cantidad 50
    await cantidadInput.fill('50');

    // 6. Clic en Agregar
    await page.click('button:has-text("Agregar")');

    // 7. Verificar que el sistema muestra el rechazo visual por stock insuficiente
    const errorMsg = page.locator('text=Stock insuficiente');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Stock insuficiente');

    // 8. Verificar que el botón de Confirmar Venta permanece deshabilitado (no hay ítems agregados)
    const btnConfirmar = page.locator('button:has-text("Confirmar Venta")');
    await expect(btnConfirmar).toBeDisabled();

    // Evidencia de rechazo
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-04-rechazo-stock-insuficiente.png') });

    // Cerrar modal
    await page.click('button:has-text("Cancelar")');
  });

  test('E2E-05: Restricciones de acceso para rol VENDEDOR', async ({ page }) => {
    // 1. Login con vendedor_test
    await loginAs(page, 'vendedor_test', 'StockX_Test_2026!');

    // 2. Verificar menú lateral del Vendedor
    // Debe ver: Productos, Ventas, Movimientos
    await expect(page.locator('nav a[href="/productos"]')).toBeVisible();
    await expect(page.locator('nav a[href="/ventas"]')).toBeVisible();
    await expect(page.locator('nav a[href="/movimientos"]')).toBeVisible();

    // NO debe ver: Dashboard, Categorías, Proveedores
    await expect(page.locator('nav a[href="/dashboard"]')).toHaveCount(0);
    await expect(page.locator('nav a[href="/categorias"]')).toHaveCount(0);
    await expect(page.locator('nav a[href="/proveedores"]')).toHaveCount(0);

    // Evidencia del menú de Vendedor
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-05-01-vendedor-menu-sin-dashboard.png') });

    // 3. Intentar navegar directamente a /dashboard
    await page.goto('/dashboard');

    // 4. Verificar que es bloqueado y redirigido a /productos (o muestra acceso restringido)
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain('/dashboard');
    expect(page.url()).toContain('/productos');

    // Evidencia tras intento de acceso al dashboard
    await page.screenshot({ path: path.join(EVIDENCIAS_DIR, 'e2e-05-02-vendedor-bloqueo-dashboard.png') });
  });

});
