# LoanPilot

Calculadora gratuita y bilingüe de préstamos, liquidaciones laborales y
retenciones salariales basada en normativa salvadoreña. Permite estimar el
costo real de un crédito, proyectar abonos y revisar escenarios de empleo y
planilla con reglas y fuentes oficiales visibles.

Sitio: [loanpilot.marloncoreas.com](https://loanpilot.marloncoreas.com)

## Páginas

- `/`: portada y directorio de herramientas.
- `/prestamos/`: préstamos, amortización y abonos a capital.
- `/finiquito/`: finiquito, indemnización y renuncia voluntaria.
- `/retenciones/`: AFP, ISSS, ISR y tablas oficiales de retención.

Cada página existe en inglés bajo `/en/`: `/en/`, `/en/loans/`, `/en/settlement/`
y `/en/withholding/`. El idioma lo determina la URL, no una preferencia
guardada, así que cada traducción es indexable y se puede compartir. La tabla de
rutas, sus metadatos y el `sitemap.xml` salen todos de `app/routes.ts`; el
sitemap se genera en el build y por eso no vive en `public/`.

## Funciones

- Cuota, intereses, seguros, comisiones y costo efectivo anual estimado.
- Amortización sobre saldo usando un año calendario de 365 días.
- Proyección de abonos extraordinarios y aportes mensuales.
- Historial de abonos con fecha y monto.
- Comparación de intereses, saldo, fecha de finalización y meses ahorrados.
- Exportación a PDF y formato compatible con Microsoft Excel.
- Estimación de finiquito e indemnización por despido injustificado o renuncia
  voluntaria, incluyendo vacaciones, aguinaldo y salario pendiente.
- Estimación de AFP, ISSS e Impuesto sobre la Renta para pagos mensuales,
  quincenales y semanales.
- Tablas oficiales de retención y recálculo de junio y diciembre, con enlaces a
  las normas vigentes.
- Interfaz responsive en español e inglés.
- Todos los cálculos se ejecutan localmente en el navegador.

## Tecnología

- React 19, TypeScript y Vite.
- CSS propio, sin framework de estilos.
- jsPDF y jsPDF AutoTable para los reportes PDF.

No hay backend, base de datos ni analítica: el sitio compila a HTML, CSS y
JavaScript estáticos. Ningún dato introducido en la calculadora abandona el
navegador.

La compilación incrusta en `index.html` una versión ya renderizada de la
página, de modo que los buscadores y las vistas previas de enlaces reciben el
contenido completo sin ejecutar JavaScript. El navegador vuelve a renderizar al
cargar, porque los valores por defecto del formulario dependen de la fecha
actual y una instantánea de compilación no puede conocerla.

## Desarrollo local

Requiere Node.js 22 o posterior.

```bash
npm ci
npm run dev
```

La dirección local se mostrará en la terminal.

## Verificación

```bash
npm test         # compila y valida el resultado del build
npm run typecheck
```

## Actualizar una regla laboral o fiscal

Las cifras normativas viven en `app/statutory.ts`, cada una con el artículo o
decreto que la respalda escrito al lado. Al cambiar cualquiera:

1. Leer el texto oficial, no una nota de prensa ni un resumen. Los enlaces del
   pie y del panel de fuentes apuntan al documento correspondiente.
2. Actualizar la constante y la cita que la acompaña.
3. Ajustar la prueba `statutory figures still match the official texts...`, que
   existe justamente para que un cambio accidental falle en vez de publicarse.
4. Mover `RULES_REVIEWED` a la fecha de la revisión. La insignia del sitio
   muestra ese valor, así que una fecha desactualizada afirma algo que no se
   comprobó.

Los salarios mínimos no son una constante suelta sino `MINIMUM_WAGE_TABLES`,
ordenada de la más nueva a la más antigua: una liquidación se calcula con la
tabla vigente el último día de trabajo. Al publicarse un decreto nuevo se
antepone una entrada; no se edita la anterior. Si la fecha de salida es previa
a la tabla más antigua verificada, la calculadora lo advierte en pantalla en
lugar de aparentar una cifra de la época.

La prueba `reproduces a real MTPS settlement statement to the cent` compara el
resultado contra una constancia real del servicio oficial del MTPS. Es la
referencia externa del módulo: si un cambio la rompe, la aritmética dejó de
coincidir con la del ministerio.

## Publicación

```bash
npm run build
```

El sitio queda en `dist/`. Su contenido puede subirse tal cual a cualquier
alojamiento estático o CDN; basta con que `index.html` quede en la raíz del
dominio y que el servidor tenga SSL activo. No se necesita un proceso Node.js
en producción: Node solo interviene durante la compilación.

`dist/` incluye un `.htaccess` con cabeceras de seguridad, compresión y reglas
de caché para servidores Apache o compatibles. Cualquier otro servidor lo
ignora sin efectos secundarios, y puede borrarse si no hace falta. El resto de
la política de seguridad de contenido viaja dentro de `index.html`, así que se
aplica con independencia del servidor.

Para generar un ZIP listo para subir:

```bash
npm run package
```

El archivo se crea en `release/loanpilot-site.zip`.

## GitHub

El flujo `.github/workflows/verify.yml` compila y valida el sitio en cada
cambio enviado a `main` y adjunta el resultado como artefacto.

El proyecto se distribuye bajo la [licencia MIT](LICENSE).

## Contribuir

Se aceptan sugerencias y correcciones, programes o no. El aviso más valioso es
cuando un cálculo no coincide con un contrato real: hay una plantilla de issue
preparada para eso que no pide ningún dato personal.

Consulta [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request, y
[SECURITY.md](SECURITY.md) si lo que encontraste es un fallo de seguridad.

## Tarjeta social

La imagen de vista previa (`public/og.png`) se genera a partir de
`scripts/og-image.html`:

```bash
npm run og
```

Requiere Chrome o Chromium instalado, sólo para esa tarea.

## Aviso

LoanPilot ofrece estimaciones educativas y no constituye asesoría financiera ni
una oferta de crédito. Las condiciones del contrato y la información de la
institución financiera prevalecen sobre cualquier simulación.
