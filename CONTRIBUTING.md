# Cómo contribuir

LoanPilot es una herramienta pequeña y gratuita. Toda ayuda es bienvenida, y no
hace falta saber programar para que sea útil.

## Si no programas

El aporte más valioso que existe para este proyecto es avisar cuando **un
cálculo no coincide con tu contrato**. Una calculadora de préstamos sólo sirve
si sus números resisten la comparación con la carta de aprobación de un banco
real, y esa comparación no la puede hacer nadie desde el código.

Abre un issue con la plantilla «Un cálculo no coincide». Pide las cifras
mínimas para reproducir el caso y **no necesita ningún dato personal**: ni tu
nombre, ni el número de cuenta, ni el nombre de la institución.

Las sugerencias de redacción también cuentan. Si una etiqueta te resultó
confusa o tuviste que releer un texto dos veces, eso es un fallo del sitio, no
tuyo.

## Si programas

```bash
npm ci
npm run dev
```

Antes de abrir un pull request:

```bash
npm test          # compila y valida el resultado
npm run typecheck
```

Ambos comandos corren también en CI sobre cada pull request.

### Cosas que conviene saber

Los cálculos viven todos en `app/page.tsx`. Usan interés sobre saldo con año
calendario de 365 días y días reales entre fechas, que es como trabajan los
bancos salvadoreños; por eso los resultados difieren ligeramente de la fórmula
francesa de cuota fija, y es intencionado.

Todas las fechas se anclan a las 12:00 UTC. No es un capricho: hacerlo en hora
local provocaba que el HTML generado en la compilación y el que produce el
navegador no coincidieran. Si tocas fechas, mantén ese criterio.

No hay backend ni analítica, y la intención es que siga siendo así. Cualquier
cambio que envíe datos del usuario fuera del navegador rompe la promesa
principal del sitio y no se aceptará.

El CSS es propio y está en `app/globals.css`, sin framework. Antes había
Tailwind y se retiró a propósito.

## Alcance

El objetivo es que alguien entienda un préstamo antes de firmarlo. Las
propuestas que amplíen eso son bienvenidas; las que conviertan el sitio en un
comparador comercial, un captador de clientes potenciales o un intermediario de
créditos, no.

LoanPilot ofrece estimaciones educativas y no es asesoría financiera.
