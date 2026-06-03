Cambios añadidos sin modificar los archivos actuales:

1) pages/CalculoTIR_TIKR_AUTO.html
   - Copia de pages/CalculoTIR.html.
   - Usa css/styles_tikr_auto.css.
   - Usa js/script_tikr_auto.js.
   - Añade un textarea para pegar la tabla completa de TIKR.

2) js/script_tikr_auto.js
   - Copia de js/script.js.
   - La función pegarDatos() ahora intenta detectar una tabla completa de TIKR.
   - Busca estas filas:
     - LTM Diluted EPS Before Extra
     - LTM Price / Diluted EPS (P/E)
     - Price (opcional)
   - Rellena automáticamente:
     - años
     - EPS
     - PER Bajo = mínimo histórico del PER
     - PER Histórico = media histórica del PER
     - PER Estimado = último PER disponible
     - Precio Actual = último valor de la fila Price, si existe
   - Si no detecta una tabla completa, mantiene el comportamiento antiguo y carga solo los EPS.

3) css/styles_tikr_auto.css
   - Copia de css/styles.css.
   - Añade solo estilos para los mensajes del parser TIKR.

Para probarlo:
- Abre pages/CalculoTIR_TIKR_AUTO.html.
- Pega la tabla completa de TIKR en el textarea.
- Pulsa "Cargar tabla".
- Revisa los campos rellenados antes de calcular.

Los archivos actuales originales no se han editado:
- pages/CalculoTIR.html
- js/script.js
- css/styles.css
