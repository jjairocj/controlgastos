import { describe, it, expect } from 'vitest';

// Función simulada para probar lógica que luego se extraerá/validará de los actions
function calculateSuggestedPayment(installments: { amount: number; isPaid: boolean }[]) {
    return installments
        .filter(i => !i.isPaid)
        .reduce((sum, i) => sum + i.amount, 0);
}

describe('Lógica Financiera de Deudas', () => {
    it('debe sumar correctamente las cuotas pendientes para el Pago Inteligente', () => {
        const installments = [
            { amount: 100000, isPaid: true },
            { amount: 100000, isPaid: false },
            { amount: 100000, isPaid: false },
        ];

        const suggested = calculateSuggestedPayment(installments);
        expect(suggested).toBe(200000);
    });

    it('debe calcular correctamente el cupo disponible', () => {
        const limit = 5000000;
        const debts = [
            { totalAmount: 1000000, paidAmount: 200000 }, // Pendiente 800k
            { totalAmount: 500000, paidAmount: 500000 },  // Pendiente 0
        ];

        const used = debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
        const available = limit - used;

        expect(used).toBe(800000);
        expect(available).toBe(4200000);
    });
});
