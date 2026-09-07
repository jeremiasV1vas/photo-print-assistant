# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

## [1.2.0] - 2026-09-07

### Agregado
- **Impresión directa desde la aplicación (RF5)**: Nuevo botón principal `🖨️ Imprimir directo` que envía el trabajo de impresión directamente a la impresora seleccionada en 300 DPI sin necesidad de buscar ni abrir archivos PDF en visores externos.
- **Selector de impresoras del sistema**: Detección automática de impresoras instaladas mediante IPC nativo en Electron, con preselección de la impresora predeterminada.
- **Ventana modal de preparación de impresión**: Renderizado en milímetros exactos (`@page`) vinculado de forma modal a la ventana principal para compatibilidad total con Wayland y Windows.
- **Validaciones y mensajes amigables en español**: Avisos visuales si no hay impresoras detectadas (`⚠️ Sin impresoras detectadas`), confirmación de envío y tratamiento de cancelación sin cierres ni errores técnicos.
- **Acción paralela "💾 Descargar PDF"**: Botón secundario para seguir contando con la opción de exportar el archivo al disco.

## [1.1.0] - 2026-09-07

### Agregado
- **Vista previa en vivo lado a lado**: Pantalla unificada con fotos a la izquierda y visor de hojas de impresión a la derecha con actualización en tiempo real.
- **Grilla adaptativa de hojas sin scroll**: Las hojas se auto-escalan en proporción (1 grande, 2 lado a lado, 3 o 4 en cuadrícula) para visualizar el trabajo completo de un solo vistazo.
- **Botones de reordenamiento de hojas**: Botones compactos (`◀ H1`, `H2 ▶`) para transferir fotos entre hojas directamente desde la vista previa.
- **Herramienta "⚡ Que todo entre en 1 hoja"**: Algoritmo de empaquetado y búsqueda binaria que normaliza el área visual de cada imagen para darles un tamaño armónico e idéntico mientras las acomoda en una sola hoja.
- **Herramienta "🔄 Girar para ahorrar hojas"**: Algoritmo local que evalúa rotaciones de 90° para minimizar el conteo de hojas de papel necesarias.
- **Herramienta "📐 Todas en" masiva**: Botones para aplicar medidas estándar y casillero de **Lado largo en cm** para definir la dimensión mayor de todo el lote manteniendo la relación de aspecto natural de cada foto.
- **Inicio maximizado**: La aplicación arranca maximizada (`mainWindow.maximize()`) en modo ventana.
- **Proporción bloqueada por defecto**: Las fotos cargadas conservan su proporción de aspecto original activa (`🔒`) por defecto.

### Modificado
- Reemplazo del botón de IA por herramientas de optimización algorítmica local sin latencia, sin costos y 100% offline.
- Eliminación del menú desplegable de tamaños en favor de campos de texto editables directos y botones rápidos.
- Reducción del margen de impresión a 4 mm seguro para impresoras estándar de papelería.
