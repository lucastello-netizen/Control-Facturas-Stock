/**
 * Products & Inventory Management
 * Gestión de catálogo de mercadería, insumos, alertas de stock, categorías y proveedor habitual.
 */

class ProductManager {
    static UNITS = ['u.', 'kg', 'g', 'l', 'ml', 'm', 'caja', 'paq.', 'docena'];

    static getFilteredProducts({ searchTerm = '', category = '', stockFilter = 'all', supplier = '' } = {}) {
        let products = StorageManager.getProducts();

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            products = products.filter(p => 
                (p.name && p.name.toLowerCase().includes(term)) ||
                (p.code && p.code.toLowerCase().includes(term)) ||
                (p.category && p.category.toLowerCase().includes(term)) ||
                (p.supplierName && p.supplierName.toLowerCase().includes(term))
            );
        }

        if (category) {
            products = products.filter(p => p.category === category);
        }

        if (supplier) {
            products = products.filter(p => p.supplierName === supplier || p.supplierId === supplier);
        }

        if (stockFilter === 'low') {
            products = products.filter(p => (p.currentStock || 0) <= (p.minStock || 0) && (p.currentStock || 0) > 0);
        } else if (stockFilter === 'out') {
            products = products.filter(p => (p.currentStock || 0) <= 0);
        } else if (stockFilter === 'normal') {
            products = products.filter(p => (p.currentStock || 0) > (p.minStock || 0));
        }

        return products.sort((a, b) => a.name.localeCompare(b.name));
    }

    static saveProductFromForm(formData) {
        let supplierName = (formData.supplierName || '').trim();
        let supplierId = formData.supplierId || '';

        // Si se seleccionó por ID, sincronizar nombre
        if (supplierId) {
            const sup = StorageManager.getSupplierById(supplierId);
            if (sup) supplierName = sup.name;
        } else if (supplierName) {
            const sup = StorageManager.getSupplierByName(supplierName);
            if (sup) supplierId = sup.id;
        }

        const product = {
            id: formData.id || undefined,
            code: (formData.code || '').trim().toUpperCase(),
            name: (formData.name || '').trim(),
            category: (formData.category || 'Materia Prima / Insumos').trim(),
            unit: formData.unit || 'u.',
            currentStock: Number(formData.currentStock || 0),
            minStock: Number(formData.minStock || 0),
            costPrice: Number(formData.costPrice || 0),
            salePrice: Number(formData.salePrice || 0),
            supplierId: supplierId,
            supplierName: supplierName,
            notes: (formData.notes || '').trim()
        };

        if (!product.name) {
            throw new Error('El nombre del insumo o producto es obligatorio.');
        }

        if (!product.code) {
            const initials = product.name.slice(0, 3).toUpperCase();
            product.code = `${initials}-${Math.floor(100 + Math.random() * 900)}`;
        }

        return StorageManager.saveProduct(product);
    }

    /**
     * Obtiene los insumos asociados a un proveedor específico:
     * 1. Aquellos que tienen asignado a este proveedor como habitual.
     * 2. Aquellos que históricamente se le hayan comprado a este proveedor.
     */
    static getProductsForSupplier(supplierIdentifier) {
        if (!supplierIdentifier) return [];

        const products = StorageManager.getProducts();
        const purchases = StorageManager.getPurchases();
        const supplier = StorageManager.getSupplierById(supplierIdentifier) || StorageManager.getSupplierByName(supplierIdentifier);
        const supName = supplier ? supplier.name.toLowerCase() : supplierIdentifier.toLowerCase();
        const supId = supplier ? supplier.id : '';

        // 1. Insumos asignados directamente en el catálogo
        const assignedIds = new Set();
        products.forEach(p => {
            if ((p.supplierId && p.supplierId === supId) || (p.supplierName && p.supplierName.toLowerCase() === supName)) {
                assignedIds.add(p.id);
            }
        });

        // 2. Insumos comprados a este proveedor en el historial
        purchases.forEach(purch => {
            if ((purch.supplier && purch.supplier.toLowerCase() === supName) || (purch.supplierId && purch.supplierId === supId)) {
                (purch.items || []).forEach(it => {
                    if (it.productId) assignedIds.add(it.productId);
                });
            }
        });

        // Retornar lista de productos con métricas de stock
        return products.filter(p => assignedIds.has(p.id)).map(p => {
            const stock = p.currentStock || 0;
            const min = p.minStock || 0;
            const isLow = stock <= min;
            // Cantidad sugerida para reponer hasta el stock mínimo (o 2 veces el stock mínimo)
            const suggestedQty = isLow ? Math.max(1, Math.ceil(min * 1.5 - stock)) : 0;

            return {
                ...p,
                isLow,
                suggestedQty
            };
        });
    }

    static quickStockAdjust(productId, adjustmentQty, type, reason) {
        const product = StorageManager.getProductById(productId);
        if (!product) throw new Error('Producto no encontrado.');

        const qty = Number(adjustmentQty);
        if (isNaN(qty) || qty <= 0) throw new Error('Ingresa una cantidad válida mayor a 0.');

        let finalDelta = qty;
        if (type === 'salida' || type === 'baja') {
            finalDelta = -qty;
        }

        const updated = StorageManager.adjustProductStock(productId, finalDelta, reason);
        return updated;
    }

    static exportProductsToCSV() {
        const products = StorageManager.getProducts();
        const settings = StorageManager.getSettings();
        const curr = settings.currency || '$';

        let csv = `LISTADO DE INSUMOS Y MERCADERIA - ${settings.businessName}\r\n`;
        csv += `Fecha: ${new Date().toLocaleDateString()}\r\n\r\n`;

        const headers = ['Codigo', 'Nombre/Descripcion', 'Categoria', 'Proveedor Habitual', 'Unidad', 'Stock Actual', 'Stock Minimo', 'Costo Unitario ($)', 'Precio Venta ($)', 'Valor Total Stock ($)', 'Estado'];
        csv += headers.map(h => `"${h}"`).join(';') + '\r\n';

        products.forEach(p => {
            const stock = p.currentStock || 0;
            const min = p.minStock || 0;
            const cost = p.costPrice || 0;
            const totalVal = Number((stock * cost).toFixed(2));
            
            let status = 'Normal';
            if (stock <= 0) status = 'Agotado';
            else if (stock <= min) status = 'Bajo Stock';

            const row = [
                p.code,
                p.name,
                p.category,
                p.supplierName || 'Sin asignar',
                p.unit,
                stock,
                min,
                cost,
                p.salePrice || 0,
                totalVal,
                status
            ];
            csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';') + '\r\n';
        });

        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Productos_Stock_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
