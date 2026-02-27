import { test, expect, devices } from '@playwright/test';

test.describe('Flujos Críticos de FinanzasTracker', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/deudas');
    });

    test('debe permitir ver los saldómetros y detalle de deudas en Desktop', async ({ page }) => {
        // Verificar que existen elementos de la sección de tarjetas
        await expect(page.locator('h2:has-text("Tarjetas de Crédito")')).toBeVisible();

        // Verificar que la deuda de ejemplo "Macbook Air M3" cargada por el seed esté visible
        await expect(page.locator('text=Macbook Air M3')).toBeVisible();
    });

    test('debe ser funcional en vista móvil', async ({ page }) => {
        // Cambiar a vista móvil (iPhone 13)
        await page.setViewportSize({ width: 390, height: 844 });

        // El sidebar debería estar oculto o colapsado (usando SidebarTrigger si es necesario)
        // Verificar que el título principal sea visible
        await expect(page.locator('h1')).toContainText('FinanzasTracker');

        // Verificar que las tarjetas de deuda se apilen correctamente
        const cards = page.locator('.grid > .rounded-xl');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('flujo de pago inteligente', async ({ page }) => {
        // 1. Buscar la cuota pendiente de la Macbook
        const payButton = page.locator('text=Registrar Pago').first();
        await payButton.click();

        // 2. Verificar que el modal de pago se abre y muestra el "Pago Inteligente"
        await expect(page.locator('text=Pago Inteligente')).toBeVisible();

        // 3. Seleccionar Pago Inteligente
        await page.locator('text=Pago Inteligente').click();

        // 4. Verificar que el monto se actualiza (opcional, dependiendo de si el input cambia)
        // 5. Cerrar modal
        await page.locator('text=Cancelar').click();
    });
});
