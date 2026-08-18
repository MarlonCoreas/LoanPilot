# LoanPilot

Calculadora gratuita y bilingüe de préstamos, liquidaciones laborales, horas
extras y retenciones salariales basada en normativa salvadoreña. Permite estimar el
costo real de un crédito, proyectar abonos y revisar escenarios de empleo y
planilla con reglas y fuentes oficiales visibles.

Sitio: [loanpilot.marloncoreas.com](https://loanpilot.marloncoreas.com)

## Páginas

- `/`: portada y directorio de herramientas.
- `/prestamos/`: préstamos, amortización y abonos a capital.
- `/tarjeta-credito/`: pago mínimo, interés total y el contraste contra un abono
  adicional mensual. No aplica ninguna regla salvadoreña —es interés sobre
  saldo— y por eso no lleva insignia de verificación, igual que `/prestamos/`.
  Reutiliza el motor de amortización de `app/loan.ts`: el saldo rotativo es ese
  mismo cálculo con dos parámetros más, un pago que es porcentaje del saldo y un
  cargo fijo que se capitaliza.
- `/finiquito/`: finiquito, indemnización y renuncia voluntaria.
- `/aguinaldo/`: días según antigüedad, parte proporcional y fecha límite de pago.
- `/horas-extras/`: horas extras, recargo nocturno, día de descanso y asueto.
- `/retenciones/`: AFP, ISSS, ISR y tablas oficiales de retención, el recálculo
  acumulado de junio y diciembre, y revisión de una boleta de pago contra ellas.
- `/renta-anual/`: el impuesto del ejercicio contra lo retenido, con el saldo a
  favor o en contra. **No es una calculadora de devoluciones**: el saldo sale en
  contra tan a menudo como a favor, y por una razón estructural —ver abajo—. Es
  la página que más se acerca a la asesoría fiscal, así que el aviso de
  estimación educativa va sobre la calculadora y no al pie, y el lenguaje es
  siempre «estimación del saldo», nunca un monto prometido.
- `/reglas-en-disputa/`: las reglas que el sitio aplica sin poder afirmar que su
  lectura sea la única defendible. No es una calculadora. Tiene dos secciones,
  porque son dos problemas distintos: **reglas en disputa**, donde un texto y
  una práctica oficial —o dos artículos— no dicen lo mismo y se aplica una de
  las dos lecturas, y **supuestos sin fuente**, donde ningún documento fija el
  dato, no hay dos lecturas que contraponer y el proyecto eligió la cifra. Cada
  ficha de la segunda declara además hasta dónde llega la elección.

Cada página existe en inglés bajo `/en/`: `/en/`, `/en/loans/`, `/en/credit-card/`,
`/en/settlement/`,
`/en/year-end-bonus/`, `/en/overtime/`, `/en/withholding/`, `/en/annual-tax-return/`
y `/en/disputed-rules/`. El idioma lo determina
la URL, no una preferencia
guardada, así que cada traducción es indexable y se puede compartir. La tabla de
rutas, sus metadatos y el `sitemap.xml` salen todos de `app/routes.ts`; el
sitemap se genera en el build y por eso no vive en `public/`.

Cada página se publica además con datos estructurados JSON-LD (`app/seo.ts`):
las calculadoras se declaran como `WebApplication` gratuita con su ruta de
navegación, la portada como `FAQPage` construido a partir de las mismas
preguntas que muestra (`app/faq.ts`), y `/reglas-en-disputa/` como `WebPage`,
porque no recibe datos ni devuelve una cifra. Así el resultado enriquecido no
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
- Estimación de aguinaldo en su propia página, para quien sigue laborando y para
  quien ya salió: escala del art. 198 según la antigüedad al 20 de octubre,
  parte proporcional cuando no se alcanza el ciclo completo, y la ventana legal
  de pago con su fecha límite. La lógica es la misma función que usa el
  finiquito, así que las dos páginas no pueden dar cifras distintas.
- Estimación de la hora extra diurna y nocturna, del recargo nocturno de la
  jornada ordinaria y del pago por trabajar en día de descanso o de asueto.
- Estimación de AFP, ISSS e Impuesto sobre la Renta para pagos mensuales,
  quincenales y semanales.
- Tablas oficiales de retención y recálculo de junio y diciembre, con enlaces a
  las normas vigentes.
- Recálculo acumulado de junio y diciembre, como tercer modo de `/retenciones/`:
  liquida el impuesto del período sobre las remuneraciones gravadas acumuladas,
  resta lo ya retenido e indica si queda diferencia a retener o retención en
  exceso —la resta se muestra desglosada, y el saldo a favor se explica en vez
  de esconderse—. Los acumulados se pueden ingresar o estimar de un salario
  mensual que no cambió en el período, con la advertencia de qué supone esa
  estimación.
- Página de reglas en disputa, generada desde el registro: toda regla marcada
  `DISPUTED` o `UNSOURCED` en `app/rules.ts` aparece automáticamente con sus dos
  lecturas, la que aplica el sitio, el porqué y el enlace a la fuente cuando
  existe. Cada callout que nombra una de esas reglas enlaza a su ficha, y la
  suite falla si una regla marcada no llega al HTML publicado.
- Revisión de boleta de pago: compara AFP, ISSS, renta y neto declarados contra
  las tablas, renglón por renglón y con un centavo de tolerancia. Cada campo es
  opcional y el que se deja vacío no se compara. Donde hay diferencia se nombra
  la causa probable —y sólo cuando su aritmética reproduce la cifra impresa— con
  el enlace a la regla que la explica. Describe diferencias; no afirma
  incumplimiento, y cierra advirtiendo que hay descuentos legítimos que la
  calculadora no conoce.
- Comparador de deudas, bajo la calculadora de `/tarjeta-credito/`: varias
  deudas con saldo, tasa y pago mínimo contra un solo presupuesto mensual, y las
  dos formas de ordenarlas —primero la más cara y primero la más pequeña— con su
  interés total, sus meses hasta quedar libre y el orden sugerido de cada una.
  No es un motor nuevo: cada dólar de interés sale del mismo
  `buildActiveSchedule` que usan préstamos y tarjeta, y lo único que agrega es a
  quién le toca el excedente cada mes. **No descalifica ninguna estrategia**: la
  más cara primero paga menos intereses y eso es aritmética, y la más pequeña
  primero cierra una cuenta antes y es la que más gente sostiene.
- Enlaces contextuales entre calculadoras, junto al resultado que levanta la
  pregunta y nunca como lista al pie: máximo dos por página.
- Compartir un cálculo por URL, con botón explícito junto a la exportación a
  PDF. Sólo viajan las entradas del usuario —montos, fechas y opciones—, jamás un
  resultado ni nada que identifique a nadie, y van en el fragmento (después del
  `#`), que el navegador nunca manda al servidor. El botón dice qué lleva el
  enlace **antes** de copiarlo, porque quien lo comparte tiene que saber que va
  con sus cifras. Al abrir una URL con fragmento las cifras se precargan y la
  página avisa en pantalla que vinieron del enlace. Todo lo que entra se valida
  contra una forma declarada (`app/share.ts`): no hay ninguna forma que acepte
  texto libre, así que un nombre no cabe aunque alguien lo escriba en la URL.
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
afirmación sobre cifras que nadie ha mirado en un año. `/prestamos/` y
`/tarjeta-credito/` no aplican ninguna regla salvadoreña y por eso no muestran
insignia: no tener afirmación es la respuesta correcta, no una omisión.

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

### Calendario de mantenimiento

Qué se revisa, cada cuánto, y qué fechas del año importan. Lo de abajo no
sustituye a `npm run check:rules`: ese avisa cuando una regla **en uso** lleva
seis meses sin verificarse y CI lo corre en cada cambio. Esta sección es lo que
el aviso no puede saber —cuándo es probable que algo cambie afuera— y por eso va
por fechas y no por antigüedad.

**Cada cambio (automático).** `npm test`, `npm run typecheck` y
`npm run check:rules` en CI. Si el aviso nombra una regla, se abre el documento
de su campo `source` y se lee el valor de vuelta. Nunca se mueve `reviewed` sin
abrir el documento: la fecha *es* la afirmación.

**Cada seis meses (a mano).** Barrer el registro completo, no sólo lo que el
aviso marca: las reglas sin `RULE_USAGE` no entran en el aviso, y las dos
entradas `NOT MODELLED` —artículo 32 y los ejercicios anteriores a 2025— son
huecos declarados que sólo se cierran leyendo.

**Sin fecha fija.** El salario mínimo se mueve por decreto ejecutivo y no tiene
calendario: el disparador es la publicación, no el mes. Igual las tasas de AFP e
ISSS y el techo cotizable. Para estos, el aviso de seis meses es toda la red que
hay, y por eso conviene que nadie lo silencie.

| Cuándo | Qué se revisa | Qué se toca si cambió |
| ------ | ------------- | --------------------- |
| **Desde finales de octubre** | **El decreto transitorio que exime el aguinaldo del ejercicio en curso.** Es lo más previsible del año y lo único que hay que ir a buscar: se aprueban en las semanas de cierre —7 dic 2021, 7 dic 2022, 29 nov 2023, 26 nov 2024, y 15 oct 2025 sólo porque acababa de moverse la ventana de pago—. Se busca en el [listado de decretos de la Asamblea](https://www.asamblea.gob.sv/decretos). Si no aparece ninguno, no hay vacío: rige el piso permanente del numeral 16) del artículo 4, que nunca fue derogado. | Una entrada nueva en `aguinaldoTaxExemption.versions` con su propio `exercise` y su `from` en la fecha del decreto. **No se edita la del año anterior**: cada decreto gobierna su ejercicio y expira con él, y `/renta-anual/` necesita las viejas para declarar años cerrados. Ningún cambio de código: para eso está el campo. |
| **20 de octubre** | Abre la ventana de pago del aguinaldo (art. 200 reformado por el D.L. 433). Sube el tráfico de `/aguinaldo/`. | Nada, si nada cambió. Es la fecha en que un error en esa página se ve. |
| **20 de diciembre** | Cierra la ventana de pago. | Nada. |
| **Junio y diciembre** | Los recálculos del literal f) del D.E. 10/2025, que es cuando `/retenciones/` recibe a quien vio un descuento distinto ese mes. | Nada, salvo que el decreto se reforme. |
| **31 de diciembre** | Cierra el ejercicio fiscal (art. 13 letra c). A partir de acá `/renta-anual/` puede declarar el año que terminó. | Nada. Es la fecha con la que se lee la tabla: el ejercicio se cotiza a su cierre, no con la tabla de hoy. |
| **Enero** | La Quincena 25 (D.L. 499): el artículo 3 la sitúa antes del 25 de enero o en esa fecha, y para el sector privado es exigible desde el 1 de enero de 2027. | La fecha privada de `quincena25MandatoryFrom` cuando llegue 2027, y la ventana si algún texto por fin dice cuándo abre. |
| **Hasta el 30 de abril** | Plazo de la declaración anual (arts. 13 y 48). Es el pico de `/renta-anual/`. | Antes de que empiece: comprobar que la tabla del artículo 37 del ejercicio que se declara es la correcta y que hay una versión que lo cubre. |

### La tabla anual y las tablas de retención

Las tablas de retención del D.E. 10/2025 son el artículo 37 con $1,600 de
deducciones ya incorporados en los tramos III y IV: la de diciembre evaluada en
una base es idéntica al artículo 37 evaluado en esa base menos $1,600, y
`tests/annual.test.mjs` lo comprueba dólar por dólar entre $5,000 y $60,000, no
en un punto suelto.

De ahí sale lo que la página tiene que explicar: **el artículo 37 no regala esos
$1,600**. Se los da a quien gana hasta $9,100 —deducción fija del art. 29 num.
7— o a quien pasa de ahí y tiene comprobantes del art. 33. Quien pasa de $9,100
y no gastó en médico ni colegiatura fue retenido de menos todo el año, y la
diferencia —20% o 30% de $1,600— aparece como saldo en contra al declarar. No es
error de nadie: es cómo están construidas las tablas.

Un contraste que parece error y no lo es: comparando las dos tablas tramo por
tramo, el desplazamiento de $1,600 aparece en tres lugares y en el primero no.
El tramo I de la tabla de diciembre cierra en $6,600 y no en $8,200, porque el
D.L. 293 fijó la base exenta en «$6,600.00 de ingresos anuales, equivalente a un
ingreso mensual de hasta $550.00» y el literal e) del D.E. 10/2025 deja los
tramos I y II sin la deducción incorporada. Hay una prueba dedicada a que nadie
lo «corrija» después.

### Inventario del registro

```bash
npm run inventory            # markdown, para pegar en un issue o un PR
npm run inventory -- --terse # una línea por regla
```

Sale de `app/rules.ts` y de nada más: cada regla con su unidad, su norma, la
fecha en que alguien la leyó por última vez, su estado y las páginas que la
aplican; y después las tres listas que importan —lo que sigue sin fuente, lo que
está en disputa, y lo que quedó fuera de alcance—, cada una con la nota completa
de la regla.

**No hay tabla de inventario escrita a mano en este README, y es deliberado.**
Una segunda copia del registro es un segundo registro, y un segundo registro se
desfasa: el primer decreto que agregue una regla deja la tabla atrás, y quien la
lea le va a creer a la mitad vieja porque tiene forma de documentación. Al 17 de
agosto de 2026 son **43 reglas en 50 versiones**, de las cuales 8 llevan estado:
4 en disputa, 2 sin fuente y 3 fuera de alcance. Ese conteo puede quedar
desactualizado; el comando, no.

Lo que queda **fuera de alcance** —las tres `NOT MODELLED`— no cabe en una
insignia y conviene tenerlo escrito entero:

- **`vacationUnmodelled`** (Código de Trabajo arts. 180 y 184). El artículo 180
  exige 200 días trabajados en el año para devengar vacación, y el formulario
  nunca pregunta cuántos días se trabajaron. El 184 suma 25% por alojamiento y
  25% por alimentación proporcionados por el patrono, y no hay campo para
  ninguno. Los dos vuelven el renglón de vacaciones una sobrestimación para
  quien los toca.
- **`annualDonationsUnmodelled`** (Ley de Impuesto sobre la Renta art. 32). El
  numeral 7 del artículo 29 manda a quien pasa de $9,100 de renta obtenida a los
  artículos 32 **y** 33, y `/renta-anual/` modela sólo el 33. A quien donó se le
  muestra un saldo mayor que el que va a declarar. El tope del artículo 32 no
  está transcrito a propósito: nadie lo ha leído contra el texto vigente para
  este proyecto, y una cifra de memoria es lo único que este registro existe
  para impedir. Modelarlo empieza por leerlo.
- **`annualTablePriorExercises`** (art. 37, texto anterior al D.L. 293). El
  registro sólo carga la tabla que resultó de la reforma, así que un ejercicio
  cerrado antes de 2025 no se puede cotizar: `/renta-anual/` ofrece 2025 como
  primer año en vez de aplicarle a un año pasado una tabla que no lo gobernó.
  Cerrar el hueco es una entrada más en `annualTaxTable.versions`; el cierre del
  ejercicio del artículo 13 letra c) ya elige sola la correcta.

Y una limitación que no es una regla y por eso no aparece en el inventario: el
**enlace para compartir** de `/prestamos/` sólo existe en el modo de préstamo
nuevo. El modo de préstamo activo lleva dos libros —los abonos ya hechos y los
cambios de tasa—, y un fragmento `clave=valor` no guarda listas. Mandar los
montos sueltos y descartar el libro en silencio daría, del otro lado, un número
distinto al que vio quien lo mandó; eso es peor que no ofrecer el botón.

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

Lo que el registro declara como decisión del proyecto y no como lectura de la
ley, anotado en su regla. Las notas lo dicen en su primera palabra: `UNSOURCED`
cuando ningún documento la fija, `DISPUTED` cuando las fuentes —o un texto y la
práctica oficial— no coinciden, y `NOT MODELLED` cuando la regla existe y no se
aplica.

Esa primera palabra es además un campo, `status`, y de él sale
`/reglas-en-disputa/`: toda versión marcada `DISPUTED` o `UNSOURCED` aparece en
esa página automáticamente, con el texto que escribe `app/disputes.ts` en los
dos idiomas. La marca decide también **en qué sección** aparece: `DISPUTED` va a
«Reglas en disputa» con sus dos lecturas (`DISPUTES`), y `UNSOURCED` a solas va
a «Supuestos sin fuente» con el silencio del texto, la cifra elegida y su
alcance (`ASSUMPTIONS`). Una versión marcada de las dos formas —el
`quincena25Window`— va a la primera: el desacuerdo es lo que el lector tiene que
decidir primero. Marcar una regla es lo único que hace falta para publicarla;
`tests/rules.test.mjs` falla si el campo y la palabra se separan, y
`tests/build-output.test.mjs` falla si una regla marcada no llega al HTML o cae
bajo el encabezado equivocado. El `NOT MODELLED` no va a esa página: no es un
desacuerdo sobre lo que dice la ley, sino un hueco en lo que este proyecto
calcula.

- **`dailySalaryDivisor`.** El divisor 30 no sale de ningún texto. El art. 183
  fija la base y el art. 142 define el salario diario en la dirección contraria
  —hora pactada por horas de la jornada—, pero ninguno fija el divisor. El 30
  está anclado empíricamente a la constancia del MTPS: con 30.42 el cálculo deja
  de coincidir con el ministerio. Va marcado `UNSOURCED` y se publica en la
  segunda sección de `/reglas-en-disputa/`, no en la primera: no hay dos
  lecturas que contraponer, hay un texto que calla y una práctica oficial que sí
  fija la cifra. Es el supuesto de mayor alcance del sitio —toda cifra diaria
  pasa por él: indemnización, vacación, aguinaldo y cada hora extra, porque la
  hora sale del día— y esa frase va en la ficha, en pantalla, no en un
  comentario del repositorio.
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
- **`aguinaldoScaleOnExit`.** Ningún artículo del capítulo VII dice a qué día se
  lee la escala del art. 198 para un contrato que terminó antes de la fecha de
  corte: el 197 mide la antigüedad en esa fecha y el 202 concede la parte
  «proporcional al tiempo trabajado» sin decir de qué escala. Se aplica la
  antigüedad del último día trabajado, que es la lectura que no presupone
  tiempo no trabajado, y la otra —siempre la mayor de las dos— se muestra al
  lado, en pantalla y en el PDF.
- **`quincena25Window`.** El art. 3 del D.L. 499 nombra a quien termina «antes
  del veinticinco de enero o en esa misma fecha» y la frase siguiente remite a
  las reglas del aguinaldo «o la parte proporcional, según corresponda». Se
  aplica la lectura restrictiva —la ventana de enero— y no la amplia, que es la
  decisión contraria a la del art. 187: allá hay una constancia oficial que
  seguir y aquí no hay práctica formada. Además, el día en que ABRE la ventana
  no está en ningún texto: se acota al 1 de enero del mismo mes, y cualquier
  otro límite inferior sería igual de inventado. Del artículo sólo viene el 25.
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
