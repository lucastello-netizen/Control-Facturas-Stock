/**
 * CMV (Costo de Mercadería Vendida) & Control de Inventario Mensual
 * Cálculos contables por Precio Promedio Ponderado (PPP)
 * Integrado con régimen de costos Netos o Brutos con Impuestos.
 */

class CMVManager {
    /**
     * Calcula los datos consolidados de CMV para un período (formato "YYYY-MM")
     */
    static calculatePeriodCMV(period) {
        const periodData = StorageManager.getPeriodData(period);
        const products = StorageManager.getProducts();
        const allPurchases = StorageManager.getPurchases();
        const settings = StorageManager.getSettings();

        // Filtrar compras del mes seleccionado
        const periodPurchases = allPurchases.filter(p => p.date && p.date.startsWith(period));

        // Acumular compras por producto en el mes
        const purchasesByProduct = {};
        let totalNetPurchases = 0;
        let totalInvoicePurchases = 0;

        periodPurchases.forEach(purchase => {
            const netSub = Number(purchase.netSubtotal || purchase.totalCost || 0);
            const totalInv = Number(purchase.totalInvoice || purchase.totalCost || 0);
            totalNetPurchases += netSub;
            totalInvoicePurchases += totalInv;

            // Factor multiplicador si el costo debe incorporar impuestos (costMode === 'gross')
            const taxMultiplier = (purchase.costMode === 'gross' && netSub > 0 && totalInv > 0)
                ? (totalInv / netSub)
                : 1;

            (purchase.items || []).forEach(item => {
                if (!purchasesByProduct[item.productId]) {
                    purchasesByProduct[item.productId] = {
                        quantity: 0,
                        totalCost: 0,
                        purchaseCount: 0
                    };
                }
                const qty = Number(item.quantity || 0);
                const sub = Number(item.subtotal || (item.quantity * item.unitCost) || 0) * taxMultiplier;

                purchasesByProduct[item.productId].quantity += qty;
                purchasesByProduct[item.productId].totalCost += sub;
                purchasesByProduct[item.productId].purchaseCount++;
            });
        });

        const initialInv = periodData.initialInventory || {};
        const finalInv = periodData.finalInventory || {};

        let summary = {
            period: period,
            status: periodData.status || 'open',
            totalInitialValue: 0,
            totalPurchasesValue: 0,
            totalNetPurchases: Number(totalNetPurchases.toFixed(2)),
            totalInvoicePurchases: Number(totalInvoicePurchases.toFixed(2)),
            totalAvailableValue: 0,
            totalFinalValue: 0,
            totalCMV: 0,
            itemCount: 0,
            items: []
        };

        products.forEach(prod => {
            const pId = prod.id;
            const initData = initialInv[pId] || { qty: 0, unitCost: (prod.costPrice || 0) };
            const initialQty = Number(initData.qty || 0);
            const initialUnitCost = Number(initData.unitCost !== undefined ? initData.unitCost : (prod.costPrice || 0));
            const initialValue = Number((initialQty * initialUnitCost).toFixed(2));

            const purch = purchasesByProduct[pId] || { quantity: 0, totalCost: 0, purchaseCount: 0 };
            const purchasedQty = Number(purch.quantity.toFixed(3));
            const purchasedCost = Number(purch.totalCost.toFixed(2));

            const availableQty = Number((initialQty + purchasedQty).toFixed(3));
            const availableValue = Number((initialValue + purchasedCost).toFixed(2));

            // Precio Promedio Ponderado (PPP)
            let ppp = 0;
            if (availableQty > 0) {
                ppp = Number((availableValue / availableQty).toFixed(2));
            } else {
                ppp = initialUnitCost || (prod.costPrice || 0);
            }

            // Conteo físico al cierre (Inventario Final)
            const hasFinalCount = finalInv[pId] !== undefined && finalInv[pId].qty !== null && finalInv[pId].qty !== '';
            const finalQty = hasFinalCount ? Number(finalInv[pId].qty || 0) : 0;
            
            // Consumo / Uso en unidades: Disponible - Final
            const usageQty = Number((availableQty - (hasFinalCount ? finalQty : 0)).toFixed(3));
            
            // Valuación del CMV y del Inventario Final
            const cmvValue = hasFinalCount ? Number((usageQty * ppp).toFixed(2)) : 0;
            const finalValue = hasFinalCount ? Number((finalQty * ppp).toFixed(2)) : 0;

            const isNegativeUsage = hasFinalCount && usageQty < 0;

            summary.items.push({
                productId: pId,
                code: prod.code || '',
                name: prod.name,
                category: prod.category || 'Sin Categoría',
                unit: prod.unit || 'u.',
                // Inicial
                initialQty,
                initialUnitCost,
                initialValue,
                // Compras
                purchasedQty,
                purchasedCost,
                purchaseCount: purch.purchaseCount,
                // Disponible
                availableQty,
                availableValue,
                // PPP
                ppp,
                // Final
                hasFinalCount,
                finalQty,
                finalValue,
                // CMV
                usageQty,
                cmvValue,
                isNegativeUsage
            });

            summary.totalInitialValue += initialValue;
            summary.totalPurchasesValue += purchasedCost;
            summary.totalAvailableValue += availableValue;
            if (hasFinalCount) {
                summary.totalFinalValue += finalValue;
                summary.totalCMV += cmvValue;
            }
        });

        // Ordenar ítems por valor de CMV descendente
        summary.items.sort((a, b) => b.cmvValue - a.cmvValue || a.name.localeCompare(b.name));
        summary.itemCount = summary.items.length;

        summary.totalInitialValue = Number(summary.totalInitialValue.toFixed(2));
        summary.totalPurchasesValue = Number(summary.totalPurchasesValue.toFixed(2));
        summary.totalAvailableValue = Number(summary.totalAvailableValue.toFixed(2));
        summary.totalFinalValue = Number(summary.totalFinalValue.toFixed(2));
        summary.totalCMV = Number(summary.totalCMV.toFixed(2));

        return summary;
    }

    /**
     * Arrastra el Inventario Final del mes anterior como Inventario Inicial del mes actual
     */
    static rollForwardFromPreviousMonth(currentPeriod) {
        const [yearStr, monthStr] = currentPeriod.split('-');
        let year = parseInt(yearStr, 10);
        let month = parseInt(monthStr, 10);

        let prevMonth = month - 1;
        let prevYear = year;
        if (prevMonth < 1) {
            prevMonth = 12;
            prevYear -= 1;
        }
        const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

        const prevCMV = this.calculatePeriodCMV(prevPeriod);
        if (!prevCMV || prevCMV.items.length === 0) {
            return { success: false, message: `No se encontraron datos en el período anterior (${prevPeriod}).` };
        }

        const currentPeriodData = StorageManager.getPeriodData(currentPeriod);
        currentPeriodData.initialInventory = currentPeriodData.initialInventory || {};

        let copiedCount = 0;
        prevCMV.items.forEach(item => {
            if (item.hasFinalCount) {
                currentPeriodData.initialInventory[item.productId] = {
                    qty: item.finalQty,
                    unitCost: item.ppp > 0 ? item.ppp : item.initialUnitCost
                };
                copiedCount++;
            }
        });

        StorageManager.savePeriodData(currentPeriod, currentPeriodData);
        return {
            success: true,
            copiedCount,
            prevPeriod,
            message: `Se transfirieron existencias de ${copiedCount} insumos desde ${prevPeriod}.`
        };
    }

    /**
     * Guarda el inventario inicial de un período
     */
    static saveInitialInventory(period, initialDataMap) {
        const periodData = StorageManager.getPeriodData(period);
        periodData.initialInventory = initialDataMap;
        StorageManager.savePeriodData(period, periodData);
        return true;
    }

    /**
     * Guarda el inventario final (conteo físico) de un período
     */
    static saveFinalInventory(period, finalDataMap) {
        const periodData = StorageManager.getPeriodData(period);
        periodData.finalInventory = finalDataMap;
        StorageManager.savePeriodData(period, periodData);
        return true;
    }

    /**
     * Exporta el cálculo de CMV mensual a formato CSV compatible con Excel
     */
    static exportCMVToCSV(period) {
        const cmvData = this.calculatePeriodCMV(period);
        const settings = StorageManager.getSettings();
        const curr = settings.currency || '$';

        let csv = `REPORTE MENSUAL DE COSTO DE MERCADERIA VENDIDA (CMV) - PERIODO ${period}\r\n`;
        csv += `Empresa: ${settings.businessName || 'Mi Negocio'}\r\n`;
        csv += `Fecha de Generacion: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\r\n`;
        csv += `Total Inv. Inicial: ${curr} ${cmvData.totalInitialValue.toLocaleString()}\r\n`;
        csv += `Total Compras Mes: ${curr} ${cmvData.totalPurchasesValue.toLocaleString()}\r\n`;
        csv += `Total Inv. Final: ${curr} ${cmvData.totalFinalValue.toLocaleString()}\r\n`;
        csv += `TOTAL CMV DEL MES: ${curr} ${cmvData.totalCMV.toLocaleString()}\r\n\r\n`;

        const headers = [
            'Codigo',
            'Insumo/Mercaderia',
            'Categoria',
            'Unidad',
            'Stock Inicial (Cant)',
            'Costo Inicial Unit ($)',
            'Valor Inicial Total ($)',
            'Compras Mes (Cant)',
            'Gasto Compras Mes ($)',
            'Disp. Total (Cant)',
            'Disp. Total ($)',
            'Costo Promedio PPP ($)',
            'Stock Final Conteo (Cant)',
            'Valor Stock Final ($)',
            'Uso/Consumo Mes (Cant)',
            'CMV Consumo Mes ($)'
        ];

        csv += headers.map(h => `"${h}"`).join(';') + '\r\n';

        cmvData.items.forEach(item => {
            const row = [
                item.code,
                item.name,
                item.category,
                item.unit,
                item.initialQty,
                item.initialUnitCost,
                item.initialValue,
                item.purchasedQty,
                item.purchasedCost,
                item.availableQty,
                item.availableValue,
                item.ppp,
                item.hasFinalCount ? item.finalQty : 'Sin conteo',
                item.hasFinalCount ? item.finalValue : 0,
                item.hasFinalCount ? item.usageQty : 0,
                item.hasFinalCount ? item.cmvValue : 0
            ];
            csv += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';') + '\r\n';
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CMV_${period}_${settings.businessName.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Calcula el CMV entre dos snapshots de inventario (conteos físicos con fecha libre).
     * Las compras incluidas son las que caen dentro del rango [initialSnap.date, finalSnap.date].
     */
    static calculateRangeCMV(initialSnapshotId, finalSnapshotId) {
        const initialSnap = StorageManager.getSnapshotById(initialSnapshotId);
        const finalSnap   = StorageManager.getSnapshotById(finalSnapshotId);

        if (!initialSnap || !finalSnap) {
            return { error: 'Uno o ambos snapshots no existen.' };
        }

        const dateFrom = initialSnap.date;
        const dateTo   = finalSnap.date;

        if (dateTo < dateFrom) {
            return { error: 'La fecha del conteo final debe ser posterior al conteo inicial.' };
        }

        const products     = StorageManager.getProducts();
        const allPurchases = StorageManager.getPurchases();
        const settings     = StorageManager.getSettings();

        // Compras dentro del rango (inclusivo en ambos extremos)
        const rangePurchases = allPurchases.filter(p => p.date && p.date >= dateFrom && p.date <= dateTo);

        const purchasesByProduct = {};
        let totalNetPurchases = 0;
        let totalInvoicePurchases = 0;

        rangePurchases.forEach(purchase => {
            const netSub   = Number(purchase.netSubtotal || purchase.totalCost || 0);
            const totalInv = Number(purchase.totalInvoice || purchase.totalCost || 0);
            totalNetPurchases     += netSub;
            totalInvoicePurchases += totalInv;

            const taxMultiplier = (purchase.costMode === 'gross' && netSub > 0 && totalInv > 0)
                ? (totalInv / netSub) : 1;

            (purchase.items || []).forEach(item => {
                if (!purchasesByProduct[item.productId]) {
                    purchasesByProduct[item.productId] = { quantity: 0, totalCost: 0, purchaseCount: 0 };
                }
                const qty = Number(item.quantity || 0);
                const sub = Number(item.subtotal || (item.quantity * item.unitCost) || 0) * taxMultiplier;
                purchasesByProduct[item.productId].quantity     += qty;
                purchasesByProduct[item.productId].totalCost    += sub;
                purchasesByProduct[item.productId].purchaseCount++;
            });
        });

        const initialItems = initialSnap.items || {};
        const finalItems   = finalSnap.items   || {};

        let summary = {
            initialSnapshot: initialSnap,
            finalSnapshot: finalSnap,
            dateFrom, dateTo,
            purchaseCount: rangePurchases.length,
            totalNetPurchases: Number(totalNetPurchases.toFixed(2)),
            totalInvoicePurchases: Number(totalInvoicePurchases.toFixed(2)),
            totalInitialValue: 0,
            totalPurchasesValue: 0,
            totalAvailableValue: 0,
            totalFinalValue: 0,
            totalCMV: 0,
            itemCount: 0,
            items: []
        };

        products.forEach(prod => {
            const pId = prod.id;
            const initData        = initialItems[pId] || { qty: 0, unitCost: (prod.costPrice || 0) };
            const initialQty      = Number(initData.qty || 0);
            const initialUnitCost = Number(initData.unitCost !== undefined ? initData.unitCost : (prod.costPrice || 0));
            const initialValue    = Number((initialQty * initialUnitCost).toFixed(2));

            const purch        = purchasesByProduct[pId] || { quantity: 0, totalCost: 0, purchaseCount: 0 };
            const purchasedQty = Number(purch.quantity.toFixed(3));
            const purchasedCost = Number(purch.totalCost.toFixed(2));

            const availableQty   = Number((initialQty + purchasedQty).toFixed(3));
            const availableValue = Number((initialValue + purchasedCost).toFixed(2));

            let ppp = 0;
            if (availableQty > 0) {
                ppp = Number((availableValue / availableQty).toFixed(2));
            } else {
                ppp = initialUnitCost || (prod.costPrice || 0);
            }

            const hasFinalCount = finalItems[pId] !== undefined && finalItems[pId].qty !== null && finalItems[pId].qty !== '';
            const finalQty      = hasFinalCount ? Number(finalItems[pId].qty || 0) : 0;
            const usageQty      = Number((availableQty - (hasFinalCount ? finalQty : 0)).toFixed(3));
            const cmvValue      = hasFinalCount ? Number((usageQty * ppp).toFixed(2)) : 0;
            const finalValue    = hasFinalCount ? Number((finalQty  * ppp).toFixed(2)) : 0;

            summary.items.push({
                productId: pId,
                code: prod.code || '',
                name: prod.name,
                category: prod.category || 'Sin Categoría',
                unit: prod.unit || 'u.',
                initialQty, initialUnitCost, initialValue,
                purchasedQty, purchasedCost,
                purchaseCount: purch.purchaseCount,
                availableQty, availableValue, ppp,
                hasFinalCount, finalQty, finalValue,
                usageQty, cmvValue,
                isNegativeUsage: hasFinalCount && usageQty < 0
            });

            summary.totalInitialValue   += initialValue;
            summary.totalPurchasesValue += purchasedCost;
            summary.totalAvailableValue += availableValue;
            if (hasFinalCount) {
                summary.totalFinalValue += finalValue;
                summary.totalCMV        += cmvValue;
            }
        });

        summary.items.sort((a, b) => b.cmvValue - a.cmvValue || a.name.localeCompare(b.name));
        summary.itemCount           = summary.items.length;
        summary.totalInitialValue   = Number(summary.totalInitialValue.toFixed(2));
        summary.totalPurchasesValue = Number(summary.totalPurchasesValue.toFixed(2));
        summary.totalAvailableValue = Number(summary.totalAvailableValue.toFixed(2));
        summary.totalFinalValue     = Number(summary.totalFinalValue.toFixed(2));
        summary.totalCMV            = Number(summary.totalCMV.toFixed(2));

        return summary;
    }

    /**
     * Exporta el CMV de un rango libre a CSV
     */
    static exportRangeCMVToCSV(initialSnapshotId, finalSnapshotId) {
        const cmvData = this.calculateRangeCMV(initialSnapshotId, finalSnapshotId);
        if (cmvData.error) { alert(cmvData.error); return; }

        const settings = StorageManager.getSettings();
        const curr     = settings.currency || '$';
        const label    = `${cmvData.dateFrom} al ${cmvData.dateTo}`;

        let csv = `REPORTE CMV POR PERÍODO LIBRE - DEL ${label}\r\n`;
        csv += `Empresa: ${settings.businessName || 'Mi Negocio'}\r\n`;
        csv += `Conteo Inicial: ${cmvData.initialSnapshot.name} (${cmvData.dateFrom})\r\n`;
        csv += `Conteo Final: ${cmvData.finalSnapshot.name} (${cmvData.dateTo})\r\n`;
        csv += `Compras incluidas en el período: ${cmvData.purchaseCount}\r\n`;
        csv += `Total Inv. Inicial: ${curr} ${cmvData.totalInitialValue.toLocaleString()}\r\n`;
        csv += `Total Compras Período: ${curr} ${cmvData.totalPurchasesValue.toLocaleString()}\r\n`;
        csv += `Total Inv. Final: ${curr} ${cmvData.totalFinalValue.toLocaleString()}\r\n`;
        csv += `TOTAL CMV DEL PERÍODO: ${curr} ${cmvData.totalCMV.toLocaleString()}\r\n\r\n`;

        const headers = [
            'Codigo','Insumo/Mercaderia','Categoria','Unidad',
            'Stock Inicial (Cant)','Costo Inicial Unit ($)','Valor Inicial Total ($)',
            'Compras Período (Cant)','Gasto Compras ($)',
            'Disp. Total (Cant)','Disp. Total ($)','Costo Promedio PPP ($)',
            'Stock Final Conteo (Cant)','Valor Stock Final ($)',
            'Uso/Consumo (Cant)','CMV Consumo ($)'
        ];
        csv += headers.map(h => `"${h}"`).join(';') + '\r\n';

        cmvData.items.forEach(item => {
            const row = [
                item.code, item.name, item.category, item.unit,
                item.initialQty, item.initialUnitCost, item.initialValue,
                item.purchasedQty, item.purchasedCost,
                item.availableQty, item.availableValue, item.ppp,
                item.hasFinalCount ? item.finalQty : 'Sin conteo',
                item.hasFinalCount ? item.finalValue : 0,
                item.hasFinalCount ? item.usageQty : 0,
                item.hasFinalCount ? item.cmvValue : 0
            ];
            csv += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';') + '\r\n';
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CMV_Periodo_${cmvData.dateFrom}_${cmvData.dateTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

