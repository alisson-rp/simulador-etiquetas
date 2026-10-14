(function (root) {
  // Catalog based on the Zebra ZPL, Network and RFID command references.
  const visual =
    '^A ^A@ ^B0 ^B1 ^B2 ^B3 ^B4 ^B5 ^B7 ^B8 ^B9 ^BA ^BB ^BC ^BD ^BE ^BF ^BI ^BJ ^BK ^BL ^BM ^BO ^BP ^BQ ^BR ^BS ^BT ^BU ^BX ^BY ^BZ ^CF ^CI ^CW ^FB ^FC ^FD ^FE ^FH ^FL ^FM ^FN ^FO ^FP ^FR ^FS ^FT ^FV ^FW ^FX ^GB ^GC ^GD ^GE ^GF ^GS ^IL ^IM ^IS ^LF ^LH ^LL ^LR ^LS ^LT ^PA ^PM ^PO ^PW ^SF ^SN ^TB ^XA ^XB ^XF ^XG ^XS ^XZ ^F8 ^F16';
  const storage = '~DB ~DE ^DF ~DG ~DN ~DS ~DT ~DU ~DY ~EG ^EG ^ID ^TO';
  const hardware =
    '^CC ~CC ^CD ~CD ^CM ^CN ^CO ^CP ^CT ~CT ^CV ~HB ~HD ^HF ^HG ^HH ~HI ~HM ~HQ ~HS ^HT ~HU ^HV ^HW ^HY ^HZ ~JA ^JB ~JB ~JC ~JD ~JE ~JF ~JG ^JH ^JI ~JI ^JJ ~JL ^JM ~JN ~JO ~JP ~JQ ~JR ^JS ~JS ^JT ^JU ^JW ~JX ^JZ ~KB ^KD ^KL ^KN ^KP ^KV ^MA ^MC ^MD ^MF ^MI ^ML ^MM ^MN ^MP ^MT ^MU ^MW ^PF ^PH ~PH ~PL ~PM ^PN ^PP ~PP ^PQ ^PR ~PR ~PS ^SC ~SD ^SE ^SI ^SL ^SO ^SP ^SQ ^SR ^SS ^ST ^SX ^SZ ~TA ~WC ^WD ~WQ ^ZZ';
  const network =
    '^KC ^NB ^NC ~NC ^ND ^NI ^NN ^NP ~NR ^NS ^NT ~NT ^NW ^WA ^WE ^WL ~WL ^WP ^WR ~WR ^WS ^WX';
  const rfid =
    '^HL ~HL ^HR ^RA ^RB ^RE ^RF ^RI ^RL ^RM ^RN ~RO ^RQ ^RR ^RS ^RT ^RU ~RV ^RW ^RZ';
  const catalog = Object.fromEntries(
    [
      [visual, 'visual'],
      [storage, 'storage'],
      [hardware, 'hardware'],
      [network, 'network'],
      [rfid, 'rfid'],
    ].flatMap(([commands, category]) =>
      commands.split(' ').map((command) => [command, { command, category }]),
    ),
  );
  const details = {
    '^A@': 'Seleciona uma fonte pelo nome do arquivo.',
    '^F8': 'Codificação de campo legada; texto Unicode é aproximado na prévia.',
    '^F16': 'Codificação de campo legada de 16 bits.',
    '^BQ': 'QR Code: modos automático e manual.',
    '^FB': 'Bloco de texto.',
    '^XG': 'Imagem GRF armazenada.',
    '^RF': 'Leitura/gravação RFID; exige hardware.',
    '^RS': 'Configuração RFID; exige hardware.',
    '^FO': 'Posição do campo.',
    '^FT': 'Posição pela linha de base.',
  };
  function lookup(command) {
    const normalized = command.toUpperCase();
    const key = /^\^A[A-Z0-9]$/.test(normalized) ? '^A' : normalized;
    const item = catalog[key];
    return item
      ? {
          ...item,
          command: normalized,
          description:
            details[key] ||
            {
              visual: 'Comando de formatação da etiqueta.',
              storage: 'Comando de arquivos e memória.',
              hardware: 'Comando de configuração ou operação da impressora.',
              network: 'Comando de rede da impressora.',
              rfid: 'Comando RFID.',
            }[item.category],
        }
      : null;
  }
  const api = { catalog, lookup };
  if (typeof module !== 'undefined') module.exports = api;
  else root.StudioCommands = api;
})(typeof window !== 'undefined' ? window : globalThis);
