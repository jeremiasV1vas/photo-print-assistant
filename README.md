# Photo Print Assistant 📸🖨️

Aplicación de escritorio diseñada para **librerías y centros de impresión**, pensada para que cualquier persona (incluso con poco manejo de computadoras) pueda acomodar, ajustar e imprimir lotes de fotografías fácilmente en hojas estándar (A4 y Carta), aprovechando al máximo el papel sin necesidad de programas complejos como Word o Photoshop.

---

## ✨ Características Principales

### 1. Vista Previa en Vivo Lado a Lado
- **Pantalla unificada**: Lista de fotos a la izquierda y hoja de impresión en vivo a la derecha. Cualquier cambio de tamaño, rotación o adición de fotos se refleja instantáneamente en la hoja real.
- **Grilla adaptativa sin scroll**: Si el trabajo requiere varias hojas, se auto-escalan en proporción (1 grande, 2 lado a lado, o en cuadrícula) para ver todo el trabajo de un solo vistazo.
- **Organización entre hojas**: Botones rápidos (`◀ H1`, `H2 ▶`) para mover fotos de una hoja a otra con un clic.

### 2. Control de Medidas Directo y Flexible
- **Medidas en cm siempre visibles**: Casilleros de `Ancho (cm) × Alto (cm)` editables en cualquier momento.
- **Proporción de aspecto bloqueada por defecto (`🔒`)**: Al modificar el ancho o el alto, la otra dimensión se recalcula automáticamente respetando la relación de aspecto original para no deformar a las personas u objetos.
- **Accesos rápidos**: Botones para tamaños estándar más pedidos (`10 × 15`, `13 × 18`, `15 × 21`, `9 × 13`, `20 × 30 cm`).

### 3. Herramientas de Optimización Algorítmica Masiva
- **⚡ Que todo entre en 1 hoja**: Búsqueda binaria que normaliza el área visual de todas las fotos cargadas para que queden con **tamaño homogéneo y equilibrado**, orientándolas y escalándolas al máximo tamaño posible dentro de 1 sola hoja.
- **🔄 Girar para ahorrar hojas**: Prueba combinaciones de orientación (0° y 90°) para reducir automáticamente la cantidad de hojas A4 o Carta a imprimir.
- **📐 Tamaño masivo ("Todas en")**:
  - Botones para fijar todas las fotos a una medida estándar (`10 × 15`, `13 × 18`, etc.) manteniendo su proporción natural.
  - **Lado largo personalizado**: Campo para fijar la medida del lado más largo (ej. `15 cm`) de todas las fotos del lote a la vez.

### 4. Impresión Directa y Exportación en PDF (RF5)
- **🖨️ Impresión directa con 1 clic**: Envía las páginas directamente a la impresora seleccionada en resolución fotográfica (300 DPI) respetando rotaciones y medidas exactas sin abrir visores externos.
- **Selector inteligente de impresoras**: Detecta automáticamente las impresoras instaladas en el sistema operativo y selecciona por defecto la predeterminada.
- **💾 Descarga de PDF**: Permite descargar el archivo PDF listo para imprimir en cualquier momento para guardarlo o enviarlo.
- **Margen seguro de 4 mm**: Configurado para evitar cortes en bordes de impresoras de papelería y foto.

---

## 🚀 Tecnologías

- **Framework**: [Electron](https://www.electronjs.org/) + [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Generación de Documentos**: [jsPDF](https://github.com/parallax/jsPDF)
- **Calidad de Código**: [Oxlint](https://oxc.rs/)

---

## 🛠️ Instalación y Desarrollo

### Requisitos
- Node.js (versión 18 o superior)
- npm

### Pasos

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/jeremiasV1vas/photo-print-assistant.git
   cd photo-print-assistant
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar la aplicación en modo desarrollo:
   ```bash
   npm run dev
   ```

4. Generar el ejecutable portable para Windows (`.exe`):
   ```bash
   npm run build:win
   ```
   El archivo generado quedará en la carpeta `dist-electron/Photo Print Assistant 1.2.0.exe` listo para copiar a un pendrive y usar directamente en cualquier computadora con Windows 10/11 sin necesidad de instalación.

5. Generar paquete para la plataforma actual (Linux/Mac/Windows):
   ```bash
   npm run build
   ```
