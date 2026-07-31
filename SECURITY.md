# Política de seguridad

## Cómo reportar

No abras un issue público para una vulnerabilidad. Usa el aviso privado de
GitHub:

**[Reportar una vulnerabilidad](https://github.com/MarlonCoreas/LoanPilot/security/advisories/new)**

Si prefieres el correo, escribe a la dirección del perfil de GitHub del
mantenedor indicando «LoanPilot» en el asunto.

Puedes esperar acuse de recibo en unos días. Al ser un proyecto mantenido en
tiempo libre no hay compromiso formal de plazos, pero cualquier fallo que
afecte a quien usa el sitio tiene prioridad sobre el resto del trabajo.

## Qué entra en el alcance

LoanPilot no tiene servidor, base de datos ni cuentas de usuario: es HTML, CSS
y JavaScript estáticos, y todo cálculo ocurre en el navegador. Eso reduce mucho
la superficie, pero siguen siendo relevantes:

- Cualquier forma de ejecutar código en la página (XSS), especialmente a través
  de los valores que se escriben en el formulario o de los archivos PDF y Excel
  que se generan.
- Que algún dato introducido en la calculadora salga del navegador. El sitio no
  hace peticiones de red durante su uso; si observas alguna, es un fallo.
- Problemas en la cadena de dependencias que lleguen al paquete publicado.
- Debilidades en la política de seguridad de contenido incrustada en
  `index.html`.

## Qué no entra

- La exactitud de un cálculo: eso es un issue normal, con la plantilla «Un
  cálculo no coincide».
- La configuración del servidor donde esté alojado el sitio, que no forma parte
  de este repositorio.
- Informes automáticos de escáneres sin un impacto demostrable.
