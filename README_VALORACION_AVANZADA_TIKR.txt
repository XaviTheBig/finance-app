NUEVA VARIANTE: Valoración Avanzada con TIKR
================================================

No se han modificado los archivos actuales de la web.

Archivos nuevos añadidos:
- pages/ValoracionAvanzada_TIKR.html
- js/valoracion_avanzada_tikr.js
- css/styles_valoracion_avanzada_tikr.css
- README_VALORACION_AVANZADA_TIKR.txt

Cómo probar:
1. Abre pages/ValoracionAvanzada_TIKR.html
2. Introduce manualmente el precio actual de la acción.
3. Pega desde TIKR las tablas:
   - Income Statement
   - Balance Sheet
   - Cash Flow Statement
   - Actuals & Forward Estimates
   - Multiples
4. Pulsa “Analizar y valorar”.

Qué calcula:
- Datos detectados: EPS futuro, Revenue, EBITDA, EBIT, FCF, deuda neta, Market Cap, acciones estimadas.
- Múltiplos sugeridos: PER, EV/FCF, EV/EBITDA, EV/EBIT usando históricos de la tabla Multiples.
- Valoración por métodos:
  - PER
  - EV / FCF
  - EV / EBITDA
  - EV / EBIT
- Precio objetivo, upside, CAGR y precio máximo de compra para una TIR objetivo.

Notas importantes:
- La valoración depende de que las filas copiadas desde TIKR mantengan nombres reconocibles.
- Los métodos EV necesitan acciones estimadas. Se derivan de Market Cap / Price Close si esos datos están en Multiples o Estimates.
- Si no se detecta deuda neta, se usa 0 como aproximación y se muestra una advertencia.
- Los múltiplos son sugerencias automáticas basadas en medias históricas; el usuario debería revisarlos antes de tomar decisiones.
