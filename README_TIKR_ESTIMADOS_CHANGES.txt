TIKR ESTIMADOS - VERSIÓN DE PRUEBA
===================================

No se han modificado los archivos actuales de la web.
Se han creado copias nuevas para poder comparar sin tocar la versión estable.

Archivos nuevos:
- pages/CalculoTIR_ESTIMADOS.html
- js/script_estimados.js
- css/styles_estimados.css
- README_TIKR_ESTIMADOS_CHANGES.txt

Cómo probar:
1. Abre pages/CalculoTIR_ESTIMADOS.html
2. Pega una tabla completa de TIKR en el bloque "Pegar datos desde TIKR".
   Funciona con:
   - Multiples | TIKR.com
   - Actuals & Forward Estimates | TIKR.com
3. Pulsa "Cargar automático".

Qué intenta rellenar automáticamente:
- Años de la tabla EPS.
- EPS usando, por prioridad:
  1) EPS Normalized
  2) LTM Diluted EPS Before Extra
  3) EPS (GAAP)
- PER Bajo: mínimo histórico de "LTM Price / Diluted EPS (P/E)" si existe.
- PER Histórico: media de "LTM Price / Diluted EPS (P/E)" si existe.
- PER Estimado: último "NTM Price / Normalized Earnings (P/E)" si existe; si no, último LTM P/E.
- Precio Actual: último valor de "Price" o "Price Close" si existe.

Nuevos insights automáticos:
- CAGR EPS TIKR.
- Revenue CAGR TIKR.
- Último EBIT Margin.
- Último ROE.
- Último Free Cash Flow.
- Alertas simples sobre margen, ROE y caída fuerte de FCF.

Notas importantes:
- Los PER se rellenan como sugerencia, no como verdad absoluta.
- PER Estimado debería revisarse manualmente antes de calcular.
- Si pegas solo la tabla de Estimados, puede rellenar EPS y métricas de calidad, pero no siempre tendrá PER histórico.
  Para rellenar PER automáticamente necesitas la tabla de Multiples o una tabla que incluya la fila LTM Price / Diluted EPS (P/E).
- Esta versión no cambia el sistema de login ni el guardado actual.
