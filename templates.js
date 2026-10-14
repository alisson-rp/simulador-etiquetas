(function (root) {
  const example = `^XA
^CI28
^PW800
^LL480
^FO40,35^A0N,38,30^FDSTUDIO ZPL^FS
^FO40,88^A0N,20,16^FDSua próxima etiqueta começa aqui.^FS
^FO40,130^GB720,2,2^FS
^FO40,160^A0N,26,21^FDPRODUTO / 001^FS
^FO40,205^A0N,20,16^FDDescrição do produto^FS
^FO40,240^A0N,20,16^FDLote: 2026   |   Qtd: 01^FS
^FO40,300^BY2^BCN,90,Y,N,N^FD123456789012^FS
^FO560,300^GB195,110,2^FS
^FO580,320^A0N,19,15^FDCONFERIDO^FS
^FO580,352^A0N,28,22^FDOK^FS
^XZ`;
  const patrimonio =
    '^XA\n^CI28\n^FO45,31^XGE:SSGFX000.GRF,1,1^FS\n^FT171,81^CI27^A0N,20,28^FDPatrimônio^FS\n^FT166,108^A0N,18,27^FD${referencia}^FS\n^FO302,23^BQN,2,5^FDLA,${referencia}^FS\n^RFW,H^RS8^FD${codigoRFID}^FS\n^PQ1,0,1,Y\n^XZ';

  root.StudioTemplates = { example, patrimonio };
})(window);
