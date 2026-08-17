# LoanPilot

Calculadora gratuita y bilingüe de préstamos, liquidaciones laborales, horas
extras y retenciones salariales basada en normativa salvadoreña. Permite estimar el
costo real de un crédito, proyectar abonos y revisar escenarios de empleo y
planilla con reglas y fuentes oficiales visibles.

Sitio: [loanpilot.marloncoreas.com](https://loanpilot.marloncoreas.com)

## Páginas

- `/`: portada y directorio de herramientas.
- `/prestamos/`: préstamos, amortización y abonos a capital.
- `/finiquito/`: finiquito, indemnización y renuncia voluntaria.
- `/horas-extras/`: horas extras, recargo nocturno, día de descanso y asueto.
- `/retenciones/`: AFP, ISSS, ISR y tablas oficiales de retención.

Cada página existe en inglés bajo `/en/`: `/en/`, `/en/loans/`, `/en/settlement/`,
`/en/overtime/` y `/en/withholding/`. El idioma lo determina la URL, no una preferencia
guardada, así que cada traducción es indexable y se puede compartir. La tabla de
rutas, sus metadatos y el `sitemap.xml` salen todos de `app/routes.ts`; el
sitemap se genera en el build y por eso no vive en `public/`.

Cada página se publica además con datos estructurados JSON-LD (`app/seo.ts`):
las calculadoras se declaran como `WebApplication` gratuita con su ruta de
navegación, y la portada como `FAQPage` construido a partir de las mismas
preguntas que muestra (`app/faq.ts`), de modo que el resultado enriquecido no
puede afirmar algo que la página no diga.

## Funciones

- Cuota, intereses, seguros, comisiones y costo efectivo anual estimado.
- Amortización sobre saldo usando un año calendario de 365 días.
- Proyección de abonos extraordinarios y aportes mensuales.
- Historial de abonos con fecha y monto.
- Comparación de intereses, saldo, fecha de finalización y meses ahorrados.
- Exportación a PDF en préstamos, finiquito y horas extras, y formato compatible
  con Microsoft Excel en préstamos. El PDF se arma en el navegador: ninguna cifra
  del cálculo sale del dispositivo para generarlo.
- Estimación de finiquito e indemnización por despido injustificado o renuncia
  voluntaria, incluyendo vacaciones, aguinaldo y salario pendiente.
- Estimación de la hora extra diurna y nocturna, del recargo nocturno de la
  jornada ordinaria y del pago por trabajar en día de descanso o de asueto.
- Estimación de AFP, ISSS e Impuesto sobre la Renta para pagos mensuales,
  quincenales y semanales.
- Tablas oficiales de retención y recálculo de junio y diciembre, con enlaces a
  las normas vigentes.
- Recálculo acumulado de junio y diciembre: liquida el impuesto del período
  sobre las remuneraciones gravadas acumuladas, resta lo ya retenido e indica
  si queda diferencia a retener o retención en exceso.
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
npm test              # compila y valida el resultado del build
npm run typecheck
npm run check:rules   # avisa de reglas en uso sin verificar hace más de 6 meses
```

## Actualizar una regla cuando cambie la ley

Todas las cifras normativas viven en un solo archivo, `app/rules.ts`. No hay
ninguna más suelta en el código: `app/statutory.ts` y `app/overtime.ts` guardan
la aritmética y las lecturas que los textos no resuelven, pero ya no guardan
ningún número que no puedan citar.

Cada regla lleva seis campos, y ninguno es decorativo:

| Campo      | Qué es |
| ---------- | ------ |
| `value`    | El valor que el cálculo aplica. |
| `unit`     | Qué cuenta ese valor, escrito. Es lo que hace visible un error de magnitud sin rehacer la aritmética: el techo del ISSS estuvo guardado como el anual `12000` junto a un comentario que hablaba de $1,000 mensuales, y sólo la división reconciliaba las dos cifras. |
| `norm`     | El artículo o decreto, redactado para poder buscarlo. |
| `source`   | La clave de `app/sources.ts` del documento que hay que abrir para comprobarlo. |
| `from`     | El primer día en que esa versión aplica. |
| `reviewed` | El día en que una persona la leyó por última vez contra ese documento. |

### El procedimiento

1. **Leer el texto oficial**, no una nota de prensa ni un resumen. El enlace
   está en el campo `source` de la propia regla.
2. **Anteponer una versión nueva** al arreglo `versions`, con su `from` en el
   día en que la norma entra en vigor. **No se edita la versión anterior.** Una
   liquidación se calcula con la regla vigente el último día de trabajo, así que
   la versión vieja sigue haciendo falta para las salidas anteriores; `ruleAt`
   elige sola. Sólo se corrige en el sitio una versión que estuviera mal
   transcrita, y entonces también se mueve su `reviewed`.
3. **Poner `reviewed` en la fecha de hoy**, y sólo en el mismo commit en que se
   abrió el documento. La insignia de cada página muestra ese valor: una fecha
   movida sin revisar es una afirmación que el sitio no puede respaldar.
4. **Ajustar la prueba** `statutory figures still match the official texts...`,
   que existe justamente para que un cambio accidental falle en vez de
   publicarse. Si el valor cambió de verdad, cambia también la prueba, y el
   commit debe decir contra qué documento.
5. **Comprobar `RULE_USAGE`** si la regla es nueva. Una regla que no aparezca en
   la lista de ninguna página no entra en el aviso de vencimiento de CI ni en la
   fecha que la página muestra, y queda envejeciendo sin que nadie la mire. La
   prueba de estructura falla si una regla no la aplica ninguna página.
6. `npm test && npm run check:rules`.

### Fechas de revisión y aviso de vencimiento

Cada página muestra la **más antigua** de las reglas que realmente aplica, no la
más nueva: una página que cita diez reglas es tan fresca como la más rezagada
de ellas, y tomar la más nueva dejaría que una edición de hoy refrescara una
afirmación sobre cifras que nadie ha mirado en un año. `/prestamos/` no aplica
ninguna regla salvadoreña y por eso no muestra insignia: no tener afirmación es
la respuesta correcta, no una omisión.

`npm run check:rules` avisa cuando una regla **en uso** lleva más de seis meses
sin verificarse, y CI lo ejecuta en cada cambio. Avisa y no rompe el build a
propósito: una fecha vencida significa que nadie ha mirado últimamente, no que
algo esté roto, y hacer fallar el build enseñaría a mover las fechas sin abrir
los documentos, que es justo lo que volvería el mecanismo peor que no tenerlo.
Con `--strict` sí falla, para quien quiera exigirlo antes de publicar.

Ninguna fecha se escribe ya a mano en dos sitios. `RULES_REVIEWED` —el que usan
el `sitemap.xml` y los datos estructurados— se calcula como la más antigua del
registro completo, y `OVERTIME_REVIEWED` como la más antigua de las reglas de su
página.

### De dónde puede salir una cifra

De un decreto, de un texto consolidado o de una publicación de la institución
que administra la regla. De la prensa, nunca. Un periódico que informa de una
reforma prueba que algo cambió, no qué dice ahora el texto, y a los seis meses
las dos cosas son indistinguibles: sólo queda un número sin documento detrás.
Cuando la única fuente disponible es periodística, la regla se queda en su
versión anterior y la brecha se anota, en lugar de rellenarse.

Por eso `aguinaldoCutoff` no cita la nota de prensa de la reforma sino el D.L.
433 del 15 de octubre de 2025 (D.O. 194, Tomo 449), y lo cita a través del
considerando V del D.L. 440 —publicado en la bóveda oficial de jurisprudencia—,
porque a agosto de 2026 el consolidado del Código de Trabajo de la Asamblea
todavía trae «doce de diciembre» en los arts. 197, 200 y 202. La prueba
`no normative figure is cited from the press` sostiene la mitad mecánica de esta
regla: toda fuente citada por una regla vive en un dominio `.gob.sv`.

### Lo que las fuentes no resuelven

Cuatro cosas que el registro declara como decisiones del proyecto y no como
lecturas de la ley, cada una anotada en su regla. Las notas lo dicen en su
primera palabra: `UNSOURCED` cuando ningún documento la fija, `DISPUTED` cuando
las fuentes —o un texto y la práctica oficial— no coinciden, y `NOT MODELLED`
cuando la regla existe y no se aplica:

- **`dailySalaryDivisor`.** El divisor 30 no sale de ningún texto. El art. 183
  fija la base y el art. 142 define el salario diario en la dirección contraria
  —hora pactada por horas de la jornada—, pero ninguno fija el divisor. El 30
  está anclado empíricamente a la constancia del MTPS: con 30.42 el cálculo deja
  de coincidir con el ministerio.
- **`aguinaldoCycleStart`.** Los arts. 196 a 202 fijan la fecha de corte y la
  ventana de pago, y mandan pagar «la parte proporcional al tiempo trabajado»,
  pero ninguno dice sobre qué período corre esa proporción. Ya no es sólo una
  laguna: son dos lecturas vivas. El módulo corre la proporción sobre el año
  calendario, que es lo que respalda el MTPS al calcular el pago anticipado
  «como si fuera en diciembre»; la constancia del MTPS sólo reconcilia con un
  ciclo desde el 12 de diciembre, y la práctica contable todavía mezcla esa
  fecha con la del 20 de octubre. El valor no se mueve por eso, y la línea de
  aguinaldo sigue siendo la única que la prueba de reconciliación deja sin
  comparar.
- **`vacationProportionalOnExit`.** El art. 187 reconoce la vacación
  proporcional cuando la terminación es con responsabilidad patronal o hay
  despido de hecho, y para quien renuncia menciona sólo la vacación del año
  continuo ya cumplido. La constancia del MTPS con la que reconcilia la suite es
  una renuncia voluntaria —tope de $26.88, que son dos salarios mínimos diarios,
  y 15 días por año— y trae la vacación proporcional en su propia línea. El
  módulo sigue al servicio oficial, y lo dice: en pantalla, en el PDF y en la
  FAQ. Aplicar la lectura literal rompería la reconciliación.
- **`vacationUnmodelled`.** El art. 180 exige 200 días trabajados en el año para
  tener derecho a vacaciones y el art. 184 añade un 25% por alojamiento y otro
  por alimentación. Ninguno se modela —el formulario no pregunta ni una cosa ni
  la otra— y ambos quedan registrados como limitación conocida, no como
  silencio.

### Salarios mínimos y referencia externa

Los salarios mínimos son la regla `minimumWage`, ordenada de la más nueva a la
más antigua como todas las demás. Si la fecha de salida es previa a la tabla más
antigua verificada, la calculadora lo advierte en pantalla en lugar de aparentar
una cifra de la época.

La prueba `reproduces a real MTPS settlement statement to the cent` compara el
resultado contra una constancia real del servicio oficial del MTPS. Es la
referencia externa del módulo: si un cambio la rompe, la aritmética dejó de
coincidir con la del ministerio.

Dos advertencias encontradas al verificar las horas extras, por si alguien
vuelve sobre el tema: la hora extra nocturna no es 2.25 veces la hora básica
sino 2.5, porque el MTPS aplica el 25% de nocturnidad sobre la hora ya recargada
al 100% —su ejemplo de $1.50 la hora lo muestra—; y el PDF divulgativo de la
Corte Suprema sobre la jornada contradice al artículo 161, ya que habla de
semana de 40 horas y de jornada nocturna a partir de las diez de la noche.

### El cálculo como documento

`app/pdf.ts` es el único sitio que sabe cómo se ve un PDF de LoanPilot: la banda
con la marca, la fecha de generación, el aviso de estimación, el pie con la
numeración de páginas y el bloque de fuentes. Una calculadora aporta sólo lo
suyo —un título, unas tablas, las notas que levantó su caso y las reglas que
aplicó— en un `PdfSpec`. Agregar el PDF de retenciones es escribir ese objeto,
no escribir jsPDF.

Los artículos no se escriben a mano en ningún diccionario de textos:
`citationsFor(ids, fecha)` los lee del registro, resuelve la versión vigente en
la fecha del caso y agrupa por documento, de modo que una cita no puede quedarse
atrás de la cifra que la sostiene. `calculateSettlement` devuelve `appliedRules`,
que son las reglas que su aritmética realmente usó: un despido no cita la Ley de
Renuncia Voluntaria, y un aguinaldo ya pagado no cita la escala del art. 198.

El documento está pensado para imprimirse en blanco y negro y llevarse a
recursos humanos o al MTPS. Nada distingue información sólo por color, el total
va en negrita además de sombreado, y las direcciones se imprimen completas
—inútiles como enlace en papel, imprescindibles para poder teclearlas—. Un
finiquito corriente cabe en una página; uno que además arrastra la ventana
ambigua del aguinaldo y la divergencia del art. 187 pasa a dos, con las fuentes
enteras en la segunda.

## Publicación

```bash
npm run build
```

El sitio queda en `dist/`. Su contenido puede subirse tal cual a cualquier
alojamiento estático o CDN; basta con que `index.html` quede en la raíz del
dominio y que el servidor tenga SSL activo. No se necesita un proceso Node.js
en producción: Node solo interviene durante la compilación.

`dist/` incluye un `.htaccess` con cabeceras de seguridad, compresión, reglas
de caché y la página de error para servidores Apache o compatibles. Cualquier
otro servidor lo ignora sin efectos secundarios, y puede borrarse si no hace
falta. El resto de la política de seguridad de contenido viaja dentro de
`index.html`, así que se aplica con independencia del servidor.

El build genera también `404.html`, que el `.htaccess` declara con
`ErrorDocument`. Es un solo archivo para todas las direcciones equivocadas: no
lleva URL canónica ni alternantes, pide no ser indexado y ofrece las cuatro
herramientas. Se escribe en español y se vuelve a dibujar en inglés si la URL
fallida empezaba con `/en/`. En un servidor que no lea `.htaccess` hay que
apuntar su propia configuración de error a ese archivo.

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

## Tarjetas sociales

Cada página tiene su propia imagen de vista previa en `public/og/`, una por
idioma: al compartir `/finiquito/` en WhatsApp la tarjeta habla de finiquito y
no de préstamos. El texto de cada tarjeta vive en `OG_CARD` (`app/routes.ts`),
junto al resto de los metadatos de la página; el diseño está en
`scripts/og-image.mjs`.

```bash
npm run og
```

Requiere Chrome o Chromium instalado, sólo para esa tarea: los PNG se versionan
en el repositorio y el build no los regenera. Hay que ejecutar ese comando
cuando cambie el texto de una tarjeta, y volver a compilar. Si falta alguna de
las diez imágenes, el build falla en lugar de publicar enlaces con la vista
previa rota.

Las redes cachean la vista previa por URL. Un enlace compartido antes de este
cambio puede seguir mostrando la tarjeta anterior durante días; el nombre de
archivo nuevo hace que cualquier enlace nuevo se refresque de inmediato.

## Aviso

LoanPilot ofrece estimaciones educativas y no constituye asesoría financiera ni
una oferta de crédito. Las condiciones del contrato y la información de la
institución financiera prevalecen sobre cualquier simulación.
