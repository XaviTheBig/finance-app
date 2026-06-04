# Valoración Avanzada TIKR - versión corregida tipo Excel

Archivos nuevos añadidos, sin modificar los existentes:

- pages/ValoracionAvanzada_TIKR_EXCEL.html
- js/valoracion_avanzada_tikr_excel.js
- css/styles_valoracion_avanzada_tikr_excel.css

Qué corrige frente a la primera versión:

1. Ya no usa como múltiplo automático la media simple de toda la tabla de múltiplos.
   Ahora usa por defecto múltiplos forward implícitos del primer año estimado, parecido a la planilla Excel.

2. El método PER pasa a ser PER ex-cash:
   (Net Income futuro × PER objetivo - Deuda neta futura) / acciones futuras.

3. Los métodos EV usan:
   (Métrica futura × múltiplo objetivo - Deuda neta futura) / acciones futuras.

4. Se da prioridad a las acciones diluidas del Income Statement.
   La versión anterior estimaba acciones como MarketCap / Price, lo que puede distorsionar mucho el resultado.

5. La valoración usa 5 años por defecto, como la hoja Excel.

6. Se añaden campos manuales para modificar:
   - PER objetivo
   - EV / FCF objetivo
   - EV / EBITDA objetivo
   - EV / EBIT objetivo

Nota:
La coincidencia exacta con Excel dependerá de que las tablas pegadas desde TIKR contengan las mismas filas y de cómo la planilla proyecte 2029/2030. Esta versión intenta replicar la lógica principal, pero mantiene los archivos actuales intactos.
