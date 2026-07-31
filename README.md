# LoanPilot

Calculadora gratuita y bilingüe de préstamos basada en normativa salvadoreña.
Permite estimar el costo real antes de contratar, proyectar abonos futuros y
reconstruir el ahorro producido por abonos históricos.

Sitio: [loanpilot.marloncoreas.com](https://loanpilot.marloncoreas.com)

## Funciones

- Cuota, intereses, seguros, comisiones y costo efectivo anual estimado.
- Amortización sobre saldo usando un año calendario de 365 días.
- Proyección de abonos extraordinarios y aportes mensuales.
- Historial de abonos con fecha y monto.
- Comparación de intereses, saldo, fecha de finalización y meses ahorrados.
- Exportación a PDF y formato compatible con Microsoft Excel.
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
