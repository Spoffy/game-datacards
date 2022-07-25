import clone from "just-clone";

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

const readCsv = async (file) => {
  if (!file) {
    return;
  }

  return fetch(file)
    .then((response) => response.text())
    .then((text) => JSON.parse(text));
};

export const get40KData = async () => {
  const lastUpdated = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Last_update.json?${new Date().getTime()}`
  );
  const dataDatasheetAbilities = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Datasheets_abilities.json?${new Date().getTime()}`
  );
  const dataStratagems = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Stratagems.json?${new Date().getTime()}`
  );
  const dataAbilities = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Abilities.json?${new Date().getTime()}`
  );
  const dataDatasheetWargear = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Datasheets_wargear.json?${new Date().getTime()}`
  );
  const dataWargearList = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Wargear_list.json?${new Date().getTime()}`
  );
  const dataWargear = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Wargear.json?${new Date().getTime()}`
  );
  const dataModels = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Datasheets_models.json?${new Date().getTime()}`
  );
  const dataKeywords = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Datasheets_keywords.json?${new Date().getTime()}`
  );
  const dataDamage = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Datasheets_damage.json?${new Date().getTime()}`
  );
  const dataFactions = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Factions.json?${new Date().getTime()}`
  );
  const sheets = await readCsv(
    `https://raw.githubusercontent.com/game-datacards/datasources/main/40k/json/Datasheets.json?${new Date().getTime()}`
  );

  dataFactions.sort((a, b) => a.name.localeCompare(b.name));

  const mappedStratagems = dataStratagems.map((stratagem) => {
    stratagem["cardType"] = "stratagem";
    return stratagem;
  });

  const mappedSheets = sheets.map((row) => {
    row["cardType"] = "datasheet";
    row["source"] = "40k";
    row["keywords"] = [
      ...new Map(
        dataKeywords
          .filter((keyword) => keyword.datasheet_id === row.id)
          .map((model) => {
            return { ...model, active: true };
          })
          .map((item) => [item["keyword"], item])
      ).values(),
    ];
    row["datasheet"] = dataModels
      .filter((model) => model.datasheet_id === row.id)
      .filter(onlyUnique)
      .map((model, index) => {
        return { ...model, active: index === 0 ? true : false };
      });

    const linkedDamageTable = dataDamage.filter((damage) => damage.datasheet_id === row.id);
    for (let index = 1; index < linkedDamageTable.length; index++) {
      const cols = linkedDamageTable[0];
      const newRow = {};

      newRow["W"] = linkedDamageTable[index]["Col1"];
      newRow[cols["Col2"]] = linkedDamageTable[index]["Col2"];
      newRow[cols["Col3"]] = linkedDamageTable[index]["Col3"];
      newRow[cols["Col4"]] = linkedDamageTable[index]["Col4"];
      if (cols["Col5"]) {
        newRow[cols["Col5"]] = linkedDamageTable[index]["Col5"];
      }
      row["datasheet"].push(newRow);
    }

    const linkedWargear = [
      ...new Map(
        dataDatasheetWargear
          .filter((wargear) => wargear.datasheet_id === row.id && wargear.is_index_wargear === "false")
          .map((item) => [item["wargear_id"], item])
      ).values(),
    ];

    row["wargear"] = [];
    linkedWargear.forEach((wargear, index) => {
      row["wargear"][index] = clone(dataWargear.find((gear) => gear.id === wargear.wargear_id));
      if (row["wargear"][index]) {
        row["wargear"][index]["active"] = index === 0 ? true : false;
        row["wargear"][index]["profiles"] = clone(
          dataWargearList.filter((wargearList) => wargearList.wargear_id === wargear.wargear_id)
        );
      }
    });
    const linkedAbilities = dataDatasheetAbilities.filter((ability) => ability.datasheet_id === row.id);
    row["abilities"] = [];
    linkedAbilities.forEach((ability, index) => {
      row["abilities"].push(dataAbilities.find((abilityInfo) => abilityInfo.id === ability.ability_id));
    });
    row["abilities"] = row["abilities"].map((ability, index) => {
      return {
        ...ability,
        showDescription: false,
        showAbility: index === 0 ? true : false,
      };
    });
    return row;
  });
  mappedSheets.shift();
  dataFactions.map((faction) => {
    faction["datasheets"] = mappedSheets
      .filter((datasheet) => datasheet.faction_id === faction.id)
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    faction["stratagems"] = mappedStratagems
      .filter((stratagem) => stratagem.faction_id === faction.id)
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    return faction;
  });

  return {
    data: dataFactions,
    version: process.env.REACT_APP_VERSION,
    lastUpdated: lastUpdated[0].last_update,
    lastCheckedForUpdate: new Date().toISOString(),
  };
};

export const getBasicData = () => {
  return {
    version: process.env.REACT_APP_VERSION,
    lastUpdated: new Date().toISOString(),
    lastCheckedForUpdate: new Date().toISOString(),
    data: [
      {
        id: "basic",
        link: "https://game-datacard.eu",
        name: "Basic Cards",
        datasheets: [
          {
            name: "Basic Card",
            role: "Unknown",
            source: "basic",
            unit_composition: "Basic unit description you can customize to your needs. Empty this field to hide it",
            id: "000000001",
            faction_id: "basic",
            cardType: "datasheet",
            abilities: [
              {
                description: "ability description",
                faction_id: "basic",
                id: "000000101",
                is_other_wargear: "false",
                name: "Basic ability",
                showAbility: true,
                showDescription: false,
                type: "Abilities",
              },
            ],
            keywords: [
              {
                active: true,
                datasheet_id: "000010201",
                is_faction_keyword: "false",
                keyword: "Basic Card",
                model: "Basic Card",
              },
            ],
            datasheet: [
              {
                A: "3",
                BS: "3+",
                Cost: "",
                Ld: "9",
                M: '6"',
                S: "3",
                Sv: "3+",
                T: "3",
                W: "5",
                WS: "3+",
                active: true,
                base_size: "32mm",
                base_size_descr: "",
                cost_description: "",
                cost_including_wargear: "true",
                datasheet_id: "000010101",
                line: "1",
                models_per_unit: "1",
                name: "Basic Card",
              },
            ],
            wargear: [
              {
                active: true,
                description: "",
                faction_id: "AS",
                faction_name: "Basic Wargear Option",
                id: "000010301",
                is_relic: "false",
                legend: "",
                name: "Basic Weapon",
                profiles: [
                  {
                    AP: "0",
                    D: "1",
                    Range: '12"',
                    S: "4",
                    abilities: "",
                    line: "1",
                    name: "Basic Weapon",
                    type: "Pistol 1",
                    wargear_id: "000001135",
                  },
                ],
                source_id: "",
                type: "Ranged Weapons",
              },
            ],
          },
        ],
        stratagems: [
          {
            cardType: "stratagem",
            source: "basic",
            cp_cost: "1",
            description: "This is an example description. You can even use _markdown_ in this text!",
            faction_id: "basic",
            id: "000006084006",
            name: "THE BASIC STRAT",
            type: "Just another stratagem",
          },
        ],
        secondaries: [
          {
            cardType: "secondary",
            source: "basic",
            description: "Score 3 victory points at the end of the battle for each enemy **CHARACTER** unit that is destroyed. At the end of the battle, if the enemy WARLORD is destroyed, score 1 extra victory point.",
            faction: "basic",
            id: "000006084106",
            name: "ASSASSINATION",
            type: "End Game Objective",
            category: "PURGE THE ENEMY",
          },
          {
            "cardType": "secondary",
            "source": "basic",
            "name": "BRING IT DOWN",
            "description": "At the end of the battle, score victory points for each enemy **MONSTER** or **VEHICLE** model that is destroyed, as follows: \n\r* Score 1 victory point for each of those destroyed models with a Wounds characteristic of 9 or less. \n\r* Score 2 victory points for each of those destroyed models with a Wounds characteristic of 10-14. \n\r* Score 3 victory points for each of those destroyed models with a Wounds characteristic of 15-19. \n\r* Score 4 victory points for each of those destroyed models with a Wounds characteristic of 20 or more.",
            "category": "PURGE THE ENEMY",
            "type": "End Game Objective",
            "faction": "basic",
            "id": "5a9ed34b-bd69-4c6c-80a1-015d8712589c"
          }
        ],
      },
    ],
  };
};

export const getNecromundaBasicData = () => {
  return {
    version: process.env.REACT_APP_VERSION,
    lastUpdated: new Date().toISOString(),
    lastCheckedForUpdate: new Date().toISOString(),
    data: [
      {
        id: "necromunda",
        link: "https://game-datacard.eu",
        name: "Necromunda Gang Cards",
        datasheets: [
          {
            name: "Gang card",
            type: "Unknown",
            source: "necromunda",
            id: "000000001",
            cost: "100",
            faction_id: "necromunda",
            cardType: "ganger",
            rules: [
              {
                active: true,
                name: "Rule 1",
                id: "000010601",
              },
            ],
            skills: [
              {
                active: true,
                name: "Ability 1",
                id: "000010701",
              },
            ],
            wargear: [
              {
                active: true,
                name: "Gear 1",
                id: "000010801",
              },
            ],
            weapons: [
              {
                active: true,
                id: "000010301",
                name: "Basic Weapon",
                profiles: [
                  {
                    id: "000010302",
                    name: "Basic Weapon",
                    S: "0",
                    L: "1",
                    S2: '12"',
                    L2: "4",
                    STR: "2",
                    AP: "1",
                    D: "1",
                    AM: "1",
                    traits: [
                      {
                        id: "000010321",
                        active: true,
                        name: "Basic Weapon",
                      },
                    ],
                  },
                ],
              },
            ],
            datasheet: {
              M: "9",
              WS: "2+",
              BS: "2+",
              S: "9",
              T: "9",
              W: "9",
              I: "2+",
              A: "9",
              LD: "9+",
              CL: "9+",
              WIL: "9+",
              INT: "9+",
              EXP: "0",
            },
          },
          {
            name: "Empty ganger card",
            type: "",
            source: "necromunda",
            id: "000000003",
            cost: "",
            faction_id: "necromunda",
            cardType: "empty-ganger",
          },
          {
            name: "Empty vehicle card",
            type: "",
            source: "necromunda",
            id: "000000004",
            cost: "",
            faction_id: "necromunda",
            cardType: "empty-vehicle",
          },
          {
            name: "Vehicle card",
            type: "Unknown",
            source: "necromunda",
            id: "000000002",
            cost: "100",
            faction_id: "necromunda",
            cardType: "vehicle",
            rules: [
              {
                active: true,
                name: "Rule 1",
                id: "000010601",
              },
            ],
            skills: [
              {
                active: true,
                name: "Ability 1",
                id: "000010701",
              },
            ],
            wargear: [
              {
                active: true,
                name: "Gear 1",
                id: "000010801",
              },
            ],
            weapons: [
              {
                active: true,
                id: "000010301",
                name: "Basic Weapon",
                profiles: [
                  {
                    id: "000010302",
                    name: "Basic Weapon",
                    S: "0",
                    L: "1",
                    S2: '12"',
                    L2: "4",
                    STR: "2",
                    AP: "1",
                    D: "1",
                    AM: "1",
                    traits: [
                      {
                        id: "000010321",
                        active: true,
                        name: "Basic Weapon",
                      },
                    ],
                  },
                ],
              },
            ],
            datasheet: {
              M: "9",
              FRONT: "2+",
              SIDE: "2+",
              REAR: "2+",
              HP: "2+",
              HND: "2+",
              SV: "2+",
              BS: "2+",
              LD: "9+",
              CL: "9+",
              WIL: "9+",
              INT: "9+",
              EXP: "0",
            },
          },
        ],
        stratagems: [
          {
            cardType: "stratagem",
            cp_cost: "1",
            description: "This is an example description. You can even use _markdown_ in this text!",
            faction_id: "necromunda",
            id: "000006084006",
            name: "THE BASIC STRAT",
            type: "Just another stratagem",
          },
        ],
      },
    ],
  };
};
