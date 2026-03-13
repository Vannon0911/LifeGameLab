# Naming Baseline

| Kanonisch | Verboten | Typ |
|---|---|---|
| playerLineageId / cpuLineageId | playerLineage / cpuId / lineagePlayer | meta:number |
| playerAliveCount / cpuAliveCount | playerCells / alivePlayers / playerCount | sim:number |
| playerEnergyIn / playerEnergyOut | energyInput / energy_income / energyGain | sim:number |
| playerEnergyNet / playerEnergyStored | netEnergy / storedE / playerEnergy | sim:number |
| lightShare / nutrientShare | lightRatio / playerLight / lightFraction | sim:number |
| seasonPhase | season / seasonValue / seasonRatio / seasonTick | sim:number |
| playerDNA / totalHarvested | dna / dnaMass / playerResources / harvestCount | sim:number |
| playerStage | stage / evolutionStage / playerEvolution | sim:number |
| zoneMap | zones / zoneGrid / tileZones / zoneArray | world:Int8Array |
| stockpileTicks | stockpileCounter / stockTick / depotTicks | sim:number |
