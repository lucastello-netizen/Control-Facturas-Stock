# Sistema de Control de Stock, Carga de Facturas con Impuestos y CMV Mensual

Aplicación completa para la gestión de inventario de mercadería e insumos, registro de facturas de compra con **liquidación impositiva (IVA, Ingresos Brutos y Percepciones)**, **carga dedicada de Inventario Inicial e Inventario Final físico**, y cálculo contable del **Costo de Mercadería Vendida (CMV)** mediante **Precio Promedio Ponderado (PPP)**.

---

## 🚀 Cómo Iniciar la Aplicación en Windows

1. **Modo Escritorio (Recomendado)**: Haz doble clic en el archivo **`Iniciar_App.bat`**. Se abrirá en una ventana independiente y limpia (Microsoft Edge en modo aplicación nativa), sin barras de navegación y sin requerir internet ni servidores.
2. **Navegador Web**: También puedes hacer doble clic sobre **`index.html`** para abrirlo en cualquier navegador (Chrome, Edge, Firefox).

---

## 🧾 1. Liquidación de Impuestos en Facturas de Compra

En la pestaña **"Cargar Compra"**, el formulario incluye un panel impositivo completo para reflejar tus facturas comerciales (Factura A, B, etc.):

- **Subtotal Neto Gravado**: Sumatoria automática de los renglones cargados (`Cantidad × Costo Neto Unitario`).
- **IVA (Impuesto al Valor Agregado)**:
  - Selector de alícuota: **21%**, **10.5%**, **27%** o **0% (Exento)**.
  - Cálculo automático del monto en pesos, editable para ajustar centavos de redondeo.
- **Percepción de Ingresos Brutos (IIBB)**:
  - Ingreso por porcentaje (ej: 1.5%, 3%) o monto directo en pesos ($).
- **Percepción de IVA**:
  - Monto retenido de IVA.
- **Otros Impuestos / No Gravados**:
  - Tasas municipales, percepciones de Ganancias o conceptos exentos.
- **TOTAL FACTURA**:
  $$\text{Total Factura} = \text{Subtotal Neto} + \text{IVA} + \text{Percep. IIBB} + \text{Percep. IVA} + \text{Otros}$$
- **Régimen de Valuación de Costo para Stock**:
  - **Costo Neto (Recomendado para Responsables Inscriptos)**: El IVA y las percepciones son créditos fiscales, por lo que el costo del insumo que impacta en el stock y en el CMV es el neto.
  - **Costo Bruto con Impuestos (Monotributistas / Costo Total)**: Los impuestos se incorporan al costo unitario de los insumos.

---

## 📋 2. Carga de Inventarios (Inicial y Final)

Accede a la pestaña **"Carga de Inventarios (II / IF)"** para gestionar las existencias del mes en una planilla estilo hoja de cálculo:

### A. Sub-pestaña: Inventario Inicial (II)
- Muestra todos los insumos de tu catálogo.
- Puedes tipear directamente la **Cantidad Inicial** y el **Costo Unitario Inicial ($)** en la tabla.
- El sistema calcula el valor total por renglón y el total acumulado en tiempo real.
- **Botón "Traer Saldo Final Mes Anterior"**: Con un solo clic copia el Inventario Final del mes pasado como Inventario Inicial del mes en curso.
- Botón **"Guardar Inventario Inicial"**.

### B. Sub-pestaña: Conteo Físico Final (IF)
- Para hacer el cierre de fin de mes:
  - Columna **Total Disponible** (`Stock Inicial + Compras acumuladas en el mes`).
  - Campo directo para escribir el **Conteo Físico Real** contado en el depósito.
  - Cálculo automático en vivo del **Consumo / Uso** (`Disponible - Conteo`).
  - Alerta inmediata si el conteo físico supera lo disponible (posible compra no registrada o conteo erróneo).
- **Botón "Imprimir Hoja de Conteo en Blanco"**: Imprime una planilla con casillas vacías para que el personal recorra el depósito anotando los conteos en papel antes de volcarlos al sistema.
- Botón **"Guardar Conteo Final y Calcular CMV"**.

---

## 📈 3. Control CMV Mensual (Cálculo Automático PPP)

El Costo de Mercadería Vendida (CMV) se determina con la ecuación contable:

$$\text{CMV} = \text{Inventario Inicial (II)} + \text{Compras del Mes (C)} - \text{Inventario Final (IF)}$$

- **Precio Promedio Ponderado (PPP)**:
  $$\text{PPP} = \frac{\text{Valor Inv. Inicial} + \text{Gasto Compras Mes}}{\text{Cantidad Inv. Inicial} + \text{Cantidad Comprada Mes}}$$
- **Uso / Consumo (Unidades)**: $\text{Disponible} - \text{Inventario Final}$.
- **CMV en Dinero ($)**: $\text{Uso} \times \text{PPP}$.
- **Balance Verificado**: Comprobación en vivo de la igualdad contable ($\Delta = 0$).
- **Exportación a Excel**: Descarga la matriz completa en `.csv` compatible con Excel en español.

---

## 💾 Respaldo y Mantenimiento
- Desde **Configuración & Backups** puedes:
  - Descargar copia de seguridad completa en `.json`.
  - Restaurar copias previas.
  - Cargar datos de prueba con facturas A con IVA e IIBB.
  - Reiniciar los datos en blanco.
