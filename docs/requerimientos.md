# Log de Requerimientos – Sistema de Armado e Impresión de Fotos

## 1. Contexto

Mi mamá (66 años, con poco manejo de computadoras) tiene una librería y ofrece el servicio de impresión de fotos. Sus clientes le envían fotos por WhatsApp en distintos formatos (JPG, PNG, JPEG), muchas veces pidiendo un tamaño específico. Ella no sabe acomodar varias fotos en una hoja ni ajustar tamaños, por lo que termina delegándome ese trabajo (usando Word u otros programas).

El objetivo es reemplazar esa tarea manual con un programa propio, simple y visual, que ella pueda usar sin ayuda.

## 2. Objetivo del proyecto

Desarrollar una aplicación de escritorio para Windows que permita cargar fotos, ajustarlas y distribuirlas automáticamente (con asistencia de una API de IA) en una o varias hojas, según el tamaño de impresión pedido por cada cliente, para luego imprimirlas o exportarlas como PDF.

## 3. Alcance (v1)

Aplicación de escritorio (Windows 10/11), de un solo usuario, sin necesidad de conexión a una base de datos ni de cuentas de usuario. Uso de una API de IA externa como asistente de recorte/orientación y de distribución de fotos en la hoja.

## 4. Requerimientos Funcionales

**RF1 – Selección de tamaño y ajuste individual de cada foto**
Dado que el usuario carga una o varias fotos, puede elegir el tamaño de impresión de cada una entre una lista de tamaños estándar sugeridos (9x13, 10x15, 13x18, 15x21 y 20x30 cm), o ingresar en cualquier momento un tamaño personalizado (ancho x alto, en cm). Esta opción de medida a gusto debe estar siempre visible y accesible, sin quedar oculta detrás de los tamaños predefinidos. Además, el usuario puede contar con la ayuda de la IA para sugerir recorte, rotación u orientación de cada foto en función del tamaño elegido.

**RF2 – Distribución automática y editable en la hoja**
Dado que el usuario ya definió los tamaños, el sistema sugiere automáticamente (con ayuda de la API de IA) la mejor distribución de las fotos dentro de la hoja, minimizando espacios vacíos. El usuario puede reordenar, mover o redimensionar manualmente cualquier foto por encima de esa sugerencia.

**RF3 – Distribución en múltiples páginas**
Dado que las fotos cargadas no entran en una sola hoja, el sistema calcula y sugiere automáticamente cuántas páginas se necesitan y cómo repartir las fotos entre ellas. El usuario puede modificar esa distribución moviendo fotos entre páginas o agregando/quitando páginas manualmente.

**RF4 – Configuración del tamaño de papel**
Dado que el usuario va a imprimir, puede elegir el tamaño de la hoja de destino (A4, Carta, u otro tamaño personalizado) antes de generar el archivo final.

**RF5 – Generación e impresión del archivo final**
Dado que el usuario ya armó la(s) página(s), puede imprimirlas directamente desde el programa (seleccionando la impresora instalada en Windows) o descargar/exportar el resultado como archivo PDF.

**RF6 – Carga visual de imágenes**
Dado que el usuario necesita cargar fotos, puede hacerlo de forma visual (miniaturas, arrastrar y soltar), tomando como carpeta de origen por defecto la carpeta "Descargas" de Windows 10/11, con opción de navegar a otra carpeta si la foto no está ahí. Deben soportarse los formatos JPG, JPEG y PNG.

## 5. Requerimientos No Funcionales

**RNF1 – Usabilidad**
La interfaz debe ser simple, visual y amena, pensada para una persona con poco manejo de computadoras: textos claros, pasos mínimos, botones grandes, sin lenguaje técnico.

**RNF2 – Carga de archivos visual**
La carga de imágenes debe ser lo más visual posible (miniaturas, arrastrar y soltar), tomando por defecto la carpeta "Descargas" de Windows 10/11, sin necesidad de escribir rutas de archivo a mano.

**RNF3 – Tolerancia a fallos de la IA**
Si la API de IA no responde o falla, el usuario debe poder seguir trabajando en modo manual (elegir tamaño y ordenar a mano), sin que el programa se bloquee o se cierre.

**RNF4 – Privacidad de las fotos**
Las imágenes no deben almacenarse de forma permanente ni compartirse con terceros más allá de lo estrictamente necesario para generar las sugerencias de la IA y el PDF final.

**RNF5 – Instalación simple**
El programa debe distribuirse como instalador o ejecutable para Windows 10/11, con una instalación simple, evitando en lo posible pedir permisos de administrador.

**RNF6 – Tiempos de respuesta**
Las sugerencias de la IA y la generación del PDF deben responder en un tiempo razonable (idealmente pocos segundos), mostrando un indicador visual de "cargando" para no confundir al usuario.

## 6. Supuestos y restricciones

- Se asume conexión a internet estable en la librería, ya que las sugerencias de recorte/distribución dependen de una API de IA externa.
- La elección del proveedor/tecnología de IA (para recorte, orientación y distribución) queda a criterio de quien desarrolle el programa, teniendo en cuenta que el propio desarrollo se va a apoyar en herramientas de IA generativa.
- La lista de tamaños estándar sugeridos (ver RF1) es un punto de partida y puede ajustarse según la casuística real de la librería; en cualquier caso, la opción de tamaño personalizado (RF1) debe mantenerse siempre disponible y no debe eliminarse en futuras iteraciones del programa.
- El formato de entrada esperado es JPG/JPEG/PNG; si llegaran fotos en HEIC (típico de iPhone), habría que evaluar una conversión previa.

## 7. Fuera de alcance (v1)

- Edición avanzada de imagen (filtros, retoque de color, eliminación de fondo, etc.).
- Gestión de múltiples usuarios o perfiles.
- Versión para Mac/Linux o versión móvil.
- Sincronización en la nube o guardado de proyectos entre sesiones.
